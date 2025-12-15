import { User, UserRole, Batch, ClientOrder, AppConfig } from '../types';

const KEYS = {
  USERS: 'avi_users',
  BATCHES: 'avi_batches',
  ORDERS: 'avi_orders',
  CONFIG: 'avi_config',
  SESSION: 'avi_session'
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

// --- Users ---

export const getUsers = (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');

export const saveUser = (user: User) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const deleteUser = (id: string) => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
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
};

export const deleteBatch = (id: string) => {
  const batches = getBatches().filter(b => b.id !== id);
  localStorage.setItem(KEYS.BATCHES, JSON.stringify(batches));
};

// --- Orders/Weighings ---

export const getOrders = (): ClientOrder[] => JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');

export const saveOrder = (order: ClientOrder) => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
};

export const getOrdersByBatch = (batchId: string) => getOrders().filter(o => o.batchId === batchId);

// --- Config ---

export const getConfig = (): AppConfig => JSON.parse(localStorage.getItem(KEYS.CONFIG) || '{}');
export const saveConfig = (cfg: AppConfig) => localStorage.setItem(KEYS.CONFIG, JSON.stringify(cfg));

export const resetApp = () => {
  localStorage.clear();
  seedData();
  window.location.reload();
};