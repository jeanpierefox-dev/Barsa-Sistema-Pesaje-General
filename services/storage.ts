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
// Prevents white screen if localStorage contains garbage data
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
    try {
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            return { valid: false, error: "Faltan campos obligatorios (API Key o Project ID)." };
        }

        // Create a temporary app instance to test validity
        const tempName = 'validator_' + Date.now();
        const app = initializeApp(firebaseConfig, tempName);
        
        // Check if we can initialize Firestore
        const db = getFirestore(app);
        
        // We don't perform a network call here to avoid waiting too long or CORS issues on simple validation,
        // but if the config is malformed (e.g. invalid chars in project ID), initializeApp usually throws.
        
        // Clean up
        await deleteApp(app);
        
        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message || "La configuración no es válida." };
    }
};

// --- Firebase Initialization ---
let db: any = null;
let unsubscribers: Function[] = [];

// Helper to push all local data to cloud immediately upon connection
const uploadLocalToCloud = async () => {
  if (!db) return;
  console.log("⬆️ Iniciando subida de datos locales a la nube...");

  const collections = [
      { name: 'users', data: getUsers() },
      { name: 'batches', data: getBatches() },
      { name: 'orders', data: getOrders() }
  ];
  
  for (const col of collections) {
      for (const item of col.data) {
          if (item && item.id) {
            try {
              // merge: true ensures we don't overwrite if cloud has newer specific fields (though normally complete overwrite is fine here)
              await setDoc(doc(db, col.name, item.id), item, { merge: true });
            } catch(e) {
              console.error(`Error syncing item ${item.id} to cloud:`, e);
            }
          }
      }
  }
  console.log("✅ Datos locales sincronizados con la nube.");
};

export const initCloudSync = async () => {
  const config = getConfig();
  
  // Clean up previous listeners if any
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  if (config.firebaseConfig?.apiKey && config.firebaseConfig?.projectId) {
    try {
      let app;
      
      // CRITICAL FIX: Check if app is already initialized to prevent crash
      if (!getApps().length) {
          app = initializeApp(config.firebaseConfig);
          // Initialize Firestore with Offline Persistence enabled only on first init
          db = initializeFirestore(app, {
              cacheSizeBytes: CACHE_SIZE_UNLIMITED
          });
      } else {
          app = getApp();
          db = getFirestore(app);
      }

      try {
          // Attempt to enable persistence only if not already enabled/failed
          await enableIndexedDbPersistence(db).catch((err) => {
             if (err.code === 'failed-precondition') {
                 // Multiple tabs open, persistence can only be enabled in one tab at a a time.
                 console.warn("Persistencia offline desactivada (Múltiples pestañas abiertas).");
             } else if (err.code === 'unimplemented') {
                 // The current browser does not support all of the features required to enable persistence
                 console.warn("Navegador no soporta persistencia offline.");
             }
          });
          console.log("💾 Base de datos lista.");
      } catch (err: any) {
          // Ignore persistence errors, continue with online mode
      }

      console.log("☁️ Nube conectada: Sincronizando datos...");
      
      // 1. Upload Local Data FIRST to ensure other devices see what we have
      await uploadLocalToCloud();

      // 2. Start Listening for changes
      startListeners();

    } catch (e) {
      console.error("Error FATAL al conectar con Firebase:", e);
      // Optional: alert the user via UI if needed, but don't crash the app
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
          
          // Keep items created locally that haven't synced yet (though uploadLocalToCloud handles most)
          const pendingUploadItems = currentLocal.filter((localItem: any) => {
              if (remoteIds.has(localItem.id)) return false;
              
              let timestamp = localItem.createdAt || localItem.timestamp;
              if (!timestamp && localItem.id && !isNaN(Number(localItem.id))) {
                  timestamp = Number(localItem.id);
              }

              if (timestamp) {
                  const now = Date.now();
                  // Keep local items created in the last 7 days if they aren't on cloud yet
                  if ((now - timestamp) < 604800000) { 
                      return true; 
                  }
              }
              return false; 
          });

          const mergedData = [...remoteData, ...pendingUploadItems];
          // Deduplicate by ID favoring remote data
          const uniqueData = Array.from(new Map(mergedData.map(item => [item.id, item])).values());

          if (uniqueData.length > 0 || snapshot.empty) {
            localStorage.setItem(storageKey, JSON.stringify(uniqueData));
            window.dispatchEvent(new Event(eventName));
          }
        });
        
        unsubscribers.push(unsub);
    } catch(e: any) {
        console.error(`Error setting up listener for ${colName}:`, e);
        if (e.code === 'permission-denied') {
            alert("⚠️ ERROR DE PERMISOS: No se pueden leer los datos.\n\nPor favor ve a Firebase Console -> Firestore Database -> Reglas y configúralas en modo 'test' (allow read, write: if true;)");
        }
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