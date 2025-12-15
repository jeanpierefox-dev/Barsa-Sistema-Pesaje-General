import { User, UserRole, Batch, ClientOrder, AppConfig } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

const KEYS = {
  USERS: 'avi_users',
  BATCHES: 'avi_batches',
  ORDERS: 'avi_orders',
  CONFIG: 'avi_config',
  SESSION: 'avi_session'
};

// --- Firebase Initialization ---
let db: any = null;
let unsubscribers: Function[] = [];

export const initCloudSync = async () => {
  const config = getConfig();
  
  // Clean up previous listeners if any
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  if (config.firebaseConfig?.apiKey && config.firebaseConfig?.projectId) {
    try {
      const app = initializeApp(config.firebaseConfig);
      
      // Initialize Firestore with Offline Persistence enabled
      // This is crucial for mobile devices with flaky connections
      db = initializeFirestore(app, {
          cacheSizeBytes: CACHE_SIZE_UNLIMITED
      });

      try {
          await enableIndexedDbPersistence(db);
          console.log("💾 Persistencia Offline Activada");
      } catch (err: any) {
          if (err.code == 'failed-precondition') {
              console.warn("Persistencia falló: Múltiples pestañas abiertas.");
          } else if (err.code == 'unimplemented') {
              console.warn("El navegador no soporta persistencia.");
          }
      }

      console.log("☁️ Nube conectada: Sincronizando datos...");
      startListeners();
    } catch (e) {
      console.error("Error al conectar con Firebase:", e);
    }
  }
};

const startListeners = () => {
  if (!db) return;

  // Helper to sync collection to localStorage with "Smart Merge"
  const syncCollection = (colName: string, storageKey: string, eventName: string) => {
    const q = collection(db, colName);
    
    const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const remoteData: any[] = [];
      snapshot.forEach((doc) => {
        remoteData.push(doc.data());
      });
      
      // SMART MERGE LOGIC (Crucial for Mobile/Offline)
      // We don't just overwrite localStorage with remoteData.
      // We check if we have LOCAL items that are NOT in remote yet (pending upload).
      // If we blindly overwrite, we lose items created while offline/bad signal.
      
      const currentLocal = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const remoteIds = new Set(remoteData.map(d => d.id));
      
      const pendingUploadItems = currentLocal.filter((localItem: any) => {
          // If it's already in remote, we use the remote version (it updates automatically below)
          if (remoteIds.has(localItem.id)) return false;

          // Item is in Local but NOT in Remote.
          // Is it a brand new item? (Created < 1 hour ago)
          // We assume missing items created recently are "Pending Upload", not "Deleted by Admin".
          
          let timestamp = localItem.createdAt || localItem.timestamp;
          
          // Fallback: Try to parse ID if it's timestamp-based (which our app uses: Date.now().toString())
          if (!timestamp && localItem.id && !isNaN(Number(localItem.id))) {
              timestamp = Number(localItem.id);
          }

          if (timestamp) {
              const now = Date.now();
              // Keep local item if created less than 1 hour ago.
              // This gives ample time for mobile to reconnect and upload.
              if ((now - timestamp) < 3600000) { 
                  return true; 
              }
          }
          
          return false; // Old item not in remote? It was likely deleted legitimately. Let it go.
      });

      // Merge: Remote Data (Source of Truth) + Pending Local Items
      const mergedData = [...remoteData, ...pendingUploadItems];
      
      // Remove duplicates by ID (Remote takes precedence)
      const uniqueData = Array.from(new Map(mergedData.map(item => [item.id, item])).values());

      // Only update if we have data or if it's a deliberate clear
      if (uniqueData.length > 0 || snapshot.empty) {
        localStorage.setItem(storageKey, JSON.stringify(uniqueData));
        window.dispatchEvent(new Event(eventName));
      }
    });
    
    unsubscribers.push(unsub);
  };

  syncCollection('users', KEYS.USERS, 'avi_data_users');
  syncCollection('batches', KEYS.BATCHES, 'avi_data_batches');
  syncCollection('orders', KEYS.ORDERS, 'avi_data_orders');
};

// --- Initialization ---

const seedData = () => {
  if (!localStorage.getItem(KEYS.USERS)) {
    const admin: User = {
      id: 'admin-1',
      username: 'admin',
      password: '123',
      name: 'Administrador Principal',
      role: UserRole.ADMIN
    };
    localStorage.setItem(KEYS.USERS, JSON.stringify([admin]));
  }
  if (!localStorage.getItem(KEYS.CONFIG)) {
    const config: AppConfig = {
      companyName: 'Avícola Demo',
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
      // NOTE: We do not need to retry manually. 
      // Firestore SDK automatically queues writes when offline and syncs when online.
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

export const getUsers = (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');

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

export const getBatches = (): Batch[] => JSON.parse(localStorage.getItem(KEYS.BATCHES) || '[]');

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

export const getOrders = (): ClientOrder[] => JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');

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

export const getConfig = (): AppConfig => JSON.parse(localStorage.getItem(KEYS.CONFIG) || '{}');
export const saveConfig = (cfg: AppConfig) => {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(cfg));
  // If config changes, try to re-init cloud
  if (cfg.firebaseConfig?.apiKey) {
    initCloudSync();
  }
};

export const isFirebaseConfigured = (): boolean => {
  const c = getConfig();
  return !!(c.firebaseConfig?.apiKey && c.firebaseConfig?.projectId);
};

export const resetApp = () => {
  localStorage.clear();
  seedData();
  window.location.reload();
};