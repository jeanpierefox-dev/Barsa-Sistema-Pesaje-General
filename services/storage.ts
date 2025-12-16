import { User, UserRole, Batch, ClientOrder, AppConfig } from '../types';
import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

const KEYS = {
  USERS: 'avi_users',
  BATCHES: 'avi_batches',
  ORDERS: 'avi_orders',
  CONFIG: 'avi_config',
  SESSION: 'avi_session'
};

// --- Helper: Safe Parse ---
const safeParse = (key: string, fallback: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`Data corruption detected in ${key}. Resetting to default.`);
        return fallback;
    }
};

// --- Validator Helper ---
export const validateConfig = async (firebaseConfig: any): Promise<{ valid: boolean; error?: string }> => {
    let app: any = null;
    try {
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            return { valid: false, error: "Faltan campos obligatorios (API Key o Project ID)." };
        }

        const tempName = 'validator_' + Date.now() + Math.random().toString(36).substring(7);
        app = initializeApp(firebaseConfig, tempName);
        const db = getFirestore(app);
        
        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message || "La configuración no es válida." };
    } finally {
        if (app) {
            try { await deleteApp(app); } catch (e) { console.warn("Error cleanup temp app", e); }
        }
    }
};

// --- CRITICAL: SEED DATABASE ON CONNECTION (OPTIMIZED) ---
// Changed to ONLY upload Users and Config to make connection instant.
// Heavy data (Batches/Orders) will sync in background via initCloudSync.
export const seedCloudDatabase = async (config: AppConfig) => {
    if (!config.firebaseConfig) return;
    
    console.log("🌱 Iniciando creación rápida de base de datos...");
    const tempName = 'seeder_' + Date.now();
    const app = initializeApp(config.firebaseConfig, tempName);
    const db = getFirestore(app);

    try {
        const users = getUsers();
        
        // Parallel upload for speed (only Users are critical for immediate login)
        const userPromises = users.map(u => setDoc(doc(db, 'users', u.id), u));
        
        // Upload config metadata if needed
        const configPromise = setDoc(doc(db, 'config', 'main'), { 
            companyName: config.companyName,
            updatedAt: Date.now()
        });

        await Promise.all([...userPromises, configPromise]);
        
        console.log("✅ Base de datos inicializada (Usuarios cargados).");

    } catch (e: any) {
        console.error("Error sembrando DB:", e);
        if (e.code === 'permission-denied') {
            throw new Error("Permisos denegados. Ve a Firebase Console -> Firestore Database -> Reglas y cámbialas a 'allow read, write: if true;'");
        }
        throw e;
    } finally {
        await deleteApp(app);
    }
};

// --- Firebase Initialization ---
let db: any = null;
let unsubscribers: Function[] = [];

// Helper to push all local data to cloud immediately upon connection (Runtime sync)
// Optimized to use Promise.all for parallel uploads instead of sequential loops
const uploadLocalToCloud = async () => {
  if (!db) return;
  console.log("⬆️ Subiendo datos locales en segundo plano...");
  
  const uploadCollection = async (colName: string, data: any[]) => {
      const promises = data.map(item => {
          if (item && item.id) {
              return setDoc(doc(db, colName, item.id), item, { merge: true })
                     .catch(e => console.error(`Error uploading ${item.id}:`, e));
          }
          return Promise.resolve();
      });
      await Promise.all(promises);
  };

  // Upload concurrently
  await Promise.all([
      uploadCollection('users', getUsers()),
      uploadCollection('batches', getBatches()),
      uploadCollection('orders', getOrders())
  ]);
  
  console.log("✅ Sincronización de fondo completada.");
};

export const initCloudSync = async () => {
  const config = getConfig();
  
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  if (config.firebaseConfig?.apiKey && config.firebaseConfig?.projectId) {
    try {
      let app;
      
      if (!getApps().length) {
          app = initializeApp(config.firebaseConfig);
          db = initializeFirestore(app, {
              cacheSizeBytes: CACHE_SIZE_UNLIMITED
          });
      } else {
          app = getApp(); 
          db = getFirestore(app);
      }

      try {
          await enableIndexedDbPersistence(db).catch(() => {});
      } catch (err) {}

      console.log("☁️ Conectado. Iniciando listeners...");
      
      // Upload local data in background (doesn't block UI)
      uploadLocalToCloud();

      startListeners();

    } catch (e) {
      console.error("Error al conectar con Firebase:", e);
    }
  }
};

const startListeners = () => {
  if (!db) return;

  const syncCollection = (colName: string, storageKey: string, eventName: string) => {
    try {
        const q = collection(db, colName);
        
        const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
          const remoteData: any[] = [];
          snapshot.forEach((doc) => {
            remoteData.push(doc.data());
          });
          
          const currentLocal = safeParse(storageKey, []);
          const remoteIds = new Set(remoteData.map(d => d.id));
          
          // Merge logic: Keep local items not yet in cloud
          const pendingUploadItems = currentLocal.filter((localItem: any) => {
              if (remoteIds.has(localItem.id)) return false;
              return true; 
          });

          const mergedData = [...remoteData, ...pendingUploadItems];
          const uniqueData = Array.from(new Map(mergedData.map(item => [item.id, item])).values());

          if (uniqueData.length > 0 || snapshot.empty) {
            localStorage.setItem(storageKey, JSON.stringify(uniqueData));
            window.dispatchEvent(new Event(eventName));
          }
        });
        
        unsubscribers.push(unsub);
    } catch(e: any) {
        console.error(`Error setting up listener for ${colName}:`, e);
    }
  };

  syncCollection('users', KEYS.USERS, 'avi_data_users');
  syncCollection('batches', KEYS.BATCHES, 'avi_data_batches');
  syncCollection('orders', KEYS.ORDERS, 'avi_data_orders');
};

// --- Initialization ---

const seedData = () => {
  if (localStorage.getItem(KEYS.USERS) === null) {
    const admin: User = {
      id: 'admin-1',
      username: 'admin',
      password: '123',
      name: 'Administrador Principal',
      role: UserRole.ADMIN
    };
    localStorage.setItem(KEYS.USERS, JSON.stringify([admin]));
  }
  if (localStorage.getItem(KEYS.CONFIG) === null) {
    const config: AppConfig = {
      companyName: 'Avícola Demo',
      organizationId: '',
      logoUrl: '',
      printerConnected: false,
      scaleConnected: false,
      defaultFullCrateBatch: 5,
      defaultEmptyCrateBatch: 10
    };
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
  }
};

seedData();

// --- Helpers for Dual Write ---
const writeToCloud = async (collectionName: string, data: any) => {
  if (db && data.id) {
    try {
      await setDoc(doc(db, collectionName, data.id), data);
    } catch (e) {
      console.error(`Error writing ${collectionName} to cloud:`, e);
    }
  }
};

const deleteFromCloud = async (collectionName: string, id: string) => {
  if (db && id) {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.error("Error deleting from cloud:", e);
    }
  }
};

// --- Users ---

export const getUsers = (): User[] => safeParse(KEYS.USERS, []);

export const saveUser = (user: User) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  writeToCloud('users', user);
};

export const deleteUser = (id: string) => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  deleteFromCloud('users', id);
};

export const login = (u: string, p: string): User | null => {
  const users = getUsers();
  return users.find(user => user.username === u && user.password === p) || null;
};

// --- Batches ---

export const getBatches = (): Batch[] => safeParse(KEYS.BATCHES, []);

export const saveBatch = (batch: Batch) => {
  const batches = getBatches();
  const idx = batches.findIndex(b => b.id === batch.id);
  if (idx >= 0) batches[idx] = batch;
  else batches.push(batch);
  localStorage.setItem(KEYS.BATCHES, JSON.stringify(batches));
  writeToCloud('batches', batch);
};

export const deleteBatch = (id: string) => {
  const batches = getBatches().filter(b => b.id !== id);
  localStorage.setItem(KEYS.BATCHES, JSON.stringify(batches));
  deleteFromCloud('batches', id);
};

// --- Orders/Weighings ---

export const getOrders = (): ClientOrder[] => safeParse(KEYS.ORDERS, []);

export const saveOrder = (order: ClientOrder) => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  writeToCloud('orders', order);
};

export const getOrdersByBatch = (batchId: string) => getOrders().filter(o => o.batchId === batchId);

// --- Config ---

export const getConfig = (): AppConfig => safeParse(KEYS.CONFIG, {});
export const saveConfig = (cfg: AppConfig) => {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(cfg));
  if (cfg.firebaseConfig?.apiKey) {
    initCloudSync();
  }
};

export const isFirebaseConfigured = (): boolean => {
  const c = getConfig();
  return !!(c.firebaseConfig?.apiKey && c.firebaseConfig?.projectId);
};

// New Helper: Import Full Backup
export const restoreBackup = (data: any) => {
    if (data.users) localStorage.setItem(KEYS.USERS, data.users);
    if (data.batches) localStorage.setItem(KEYS.BATCHES, data.batches);
    if (data.orders) localStorage.setItem(KEYS.ORDERS, data.orders);
    if (data.config) localStorage.setItem(KEYS.CONFIG, data.config);
    window.location.reload();
};

export const resetApp = () => {
  localStorage.clear();
  seedData();
  window.location.reload();
};