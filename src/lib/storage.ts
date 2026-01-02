import type { User, Vehicle, Client, Bank, Simulation, Proposal, Receipt, Sale, ActivityLog } from '@/types';

const STORAGE_KEYS = {
  USERS: 'autos_serra_users',
  CURRENT_USER: 'autos_serra_current_user',
  SESSION_EXPIRY: 'autos_serra_session_expiry',
  VEHICLES: 'autos_serra_vehicles',
  CLIENTS: 'autos_serra_clients',
  BANKS: 'autos_serra_banks',
  SIMULATIONS: 'autos_serra_simulations',
  PROPOSALS: 'autos_serra_proposals',
  RECEIPTS: 'autos_serra_receipts',
  SALES: 'autos_serra_sales',
  ACTIVITY_LOG: 'autos_serra_activity_log',
  SETTINGS: 'autos_serra_settings',
};

// Generic storage functions
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate proposal/receipt number
export function generateNumber(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}${year}${month}${random}`;
}

// Initialize default data
export function initializeDefaultData(): void {
  // Initialize default users if none exist
  const users = getItem<User[]>(STORAGE_KEYS.USERS, []);
  if (users.length === 0) {
    const defaultUsers: User[] = [
      {
        id: generateId(),
        name: 'Administrador',
        email: 'admin@autosdoserra.com.br',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Carlos Silva',
        email: 'carlos@autosdoserra.com.br',
        role: 'vendedor',
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Maria Santos',
        email: 'maria@autosdoserra.com.br',
        role: 'vendedor',
        createdAt: new Date().toISOString(),
      },
    ];
    setItem(STORAGE_KEYS.USERS, defaultUsers);
  }

  // Initialize default banks if none exist
  const banks = getItem<Bank[]>(STORAGE_KEYS.BANKS, []);
  if (banks.length === 0) {
    const defaultBanks: Bank[] = [
      {
        id: generateId(),
        name: 'BV Financeira',
        rates: { 12: 1.89, 24: 1.99, 36: 2.09, 48: 2.19, 60: 2.29 },
        commission: 2.5,
        active: true,
      },
      {
        id: generateId(),
        name: 'Bradesco',
        rates: { 12: 1.79, 24: 1.89, 36: 1.99, 48: 2.09, 60: 2.19 },
        commission: 2.0,
        active: true,
      },
      {
        id: generateId(),
        name: 'C6 Bank',
        rates: { 12: 1.69, 24: 1.79, 36: 1.89, 48: 1.99, 60: 2.09 },
        commission: 1.8,
        active: true,
      },
      {
        id: generateId(),
        name: 'Financiamento Próprio Autos da Serra',
        rates: { 12: 2.49, 24: 2.59, 36: 2.69, 48: 2.79, 60: 2.89 },
        commission: 5.0,
        active: true,
      },
    ];
    setItem(STORAGE_KEYS.BANKS, defaultBanks);
  }
}

// User storage
export const userStorage = {
  getAll: (): User[] => getItem<User[]>(STORAGE_KEYS.USERS, []),
  getById: (id: string): User | undefined => userStorage.getAll().find(u => u.id === id),
  save: (user: User): void => {
    const users = userStorage.getAll();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    setItem(STORAGE_KEYS.USERS, users);
  },
  delete: (id: string): void => {
    const users = userStorage.getAll().filter(u => u.id !== id);
    setItem(STORAGE_KEYS.USERS, users);
  },
};

// Session storage
export const sessionStorage = {
  getCurrentUser: (): User | null => getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null),
  setCurrentUser: (user: User | null): void => {
    setItem(STORAGE_KEYS.CURRENT_USER, user);
    if (user) {
      // Set session expiry to 8 hours
      const expiry = Date.now() + 8 * 60 * 60 * 1000;
      setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry);
    }
  },
  isSessionValid: (): boolean => {
    const expiry = getItem<number>(STORAGE_KEYS.SESSION_EXPIRY, 0);
    return Date.now() < expiry;
  },
  clearSession: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
  },
};

// Vehicle storage
export const vehicleStorage = {
  getAll: (): Vehicle[] => getItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []),
  getById: (id: string): Vehicle | undefined => vehicleStorage.getAll().find(v => v.id === id),
  save: (vehicle: Vehicle): void => {
    const vehicles = vehicleStorage.getAll();
    const index = vehicles.findIndex(v => v.id === vehicle.id);
    if (index >= 0) {
      vehicles[index] = { ...vehicle, updatedAt: new Date().toISOString() };
    } else {
      vehicles.push(vehicle);
    }
    setItem(STORAGE_KEYS.VEHICLES, vehicles);
  },
  delete: (id: string): void => {
    const vehicles = vehicleStorage.getAll().filter(v => v.id !== id);
    setItem(STORAGE_KEYS.VEHICLES, vehicles);
  },
};

// Client storage
export const clientStorage = {
  getAll: (): Client[] => getItem<Client[]>(STORAGE_KEYS.CLIENTS, []),
  getById: (id: string): Client | undefined => clientStorage.getAll().find(c => c.id === id),
  getByVendor: (vendorId: string): Client[] => clientStorage.getAll().filter(c => c.vendorId === vendorId),
  save: (client: Client): void => {
    const clients = clientStorage.getAll();
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) {
      clients[index] = { ...client, updatedAt: new Date().toISOString() };
    } else {
      clients.push(client);
    }
    setItem(STORAGE_KEYS.CLIENTS, clients);
  },
  delete: (id: string): void => {
    const clients = clientStorage.getAll().filter(c => c.id !== id);
    setItem(STORAGE_KEYS.CLIENTS, clients);
  },
};

// Bank storage
export const bankStorage = {
  getAll: (): Bank[] => getItem<Bank[]>(STORAGE_KEYS.BANKS, []),
  getById: (id: string): Bank | undefined => bankStorage.getAll().find(b => b.id === id),
  getActive: (): Bank[] => bankStorage.getAll().filter(b => b.active),
  save: (bank: Bank): void => {
    const banks = bankStorage.getAll();
    const index = banks.findIndex(b => b.id === bank.id);
    if (index >= 0) {
      banks[index] = bank;
    } else {
      banks.push(bank);
    }
    setItem(STORAGE_KEYS.BANKS, banks);
  },
  delete: (id: string): void => {
    const banks = bankStorage.getAll().filter(b => b.id !== id);
    setItem(STORAGE_KEYS.BANKS, banks);
  },
};

// Simulation storage
export const simulationStorage = {
  getAll: (): Simulation[] => getItem<Simulation[]>(STORAGE_KEYS.SIMULATIONS, []),
  getById: (id: string): Simulation | undefined => simulationStorage.getAll().find(s => s.id === id),
  getByVendor: (vendorId: string): Simulation[] => simulationStorage.getAll().filter(s => s.vendorId === vendorId),
  save: (simulation: Simulation): void => {
    const simulations = simulationStorage.getAll();
    const index = simulations.findIndex(s => s.id === simulation.id);
    if (index >= 0) {
      simulations[index] = simulation;
    } else {
      simulations.push(simulation);
    }
    setItem(STORAGE_KEYS.SIMULATIONS, simulations);
  },
  delete: (id: string): void => {
    const simulations = simulationStorage.getAll().filter(s => s.id !== id);
    setItem(STORAGE_KEYS.SIMULATIONS, simulations);
  },
};

// Proposal storage
export const proposalStorage = {
  getAll: (): Proposal[] => getItem<Proposal[]>(STORAGE_KEYS.PROPOSALS, []),
  getById: (id: string): Proposal | undefined => proposalStorage.getAll().find(p => p.id === id),
  getByVendor: (vendorId: string): Proposal[] => proposalStorage.getAll().filter(p => p.vendorId === vendorId),
  getByClient: (clientId: string): Proposal[] => proposalStorage.getAll().filter(p => p.clientId === clientId),
  save: (proposal: Proposal): void => {
    const proposals = proposalStorage.getAll();
    const index = proposals.findIndex(p => p.id === proposal.id);
    if (index >= 0) {
      proposals[index] = { ...proposal, updatedAt: new Date().toISOString() };
    } else {
      proposals.push(proposal);
    }
    setItem(STORAGE_KEYS.PROPOSALS, proposals);
  },
  delete: (id: string): void => {
    const proposals = proposalStorage.getAll().filter(p => p.id !== id);
    setItem(STORAGE_KEYS.PROPOSALS, proposals);
  },
};

// Receipt storage
export const receiptStorage = {
  getAll: (): Receipt[] => getItem<Receipt[]>(STORAGE_KEYS.RECEIPTS, []),
  getById: (id: string): Receipt | undefined => receiptStorage.getAll().find(r => r.id === id),
  getByVendor: (vendorId: string): Receipt[] => receiptStorage.getAll().filter(r => r.vendorId === vendorId),
  getByClient: (clientId: string): Receipt[] => receiptStorage.getAll().filter(r => r.clientId === clientId),
  save: (receipt: Receipt): void => {
    const receipts = receiptStorage.getAll();
    const index = receipts.findIndex(r => r.id === receipt.id);
    if (index >= 0) {
      receipts[index] = receipt;
    } else {
      receipts.push(receipt);
    }
    setItem(STORAGE_KEYS.RECEIPTS, receipts);
  },
  delete: (id: string): void => {
    const receipts = receiptStorage.getAll().filter(r => r.id !== id);
    setItem(STORAGE_KEYS.RECEIPTS, receipts);
  },
};

// Sale storage
export const saleStorage = {
  getAll: (): Sale[] => getItem<Sale[]>(STORAGE_KEYS.SALES, []),
  getById: (id: string): Sale | undefined => saleStorage.getAll().find(s => s.id === id),
  getByVendor: (vendorId: string): Sale[] => saleStorage.getAll().filter(s => s.vendorId === vendorId),
  save: (sale: Sale): void => {
    const sales = saleStorage.getAll();
    const index = sales.findIndex(s => s.id === sale.id);
    if (index >= 0) {
      sales[index] = sale;
    } else {
      sales.push(sale);
    }
    setItem(STORAGE_KEYS.SALES, sales);
  },
  delete: (id: string): void => {
    const sales = saleStorage.getAll().filter(s => s.id !== id);
    setItem(STORAGE_KEYS.SALES, sales);
  },
};

// Activity log
export const activityLog = {
  getAll: (): ActivityLog[] => getItem<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOG, []),
  add: (userId: string, action: string, details: string): void => {
    const logs = activityLog.getAll();
    logs.unshift({
      id: generateId(),
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 500 logs
    setItem(STORAGE_KEYS.ACTIVITY_LOG, logs.slice(0, 500));
  },
};

// Backup functions
export const backup = {
  export: (): string => {
    const data = {
      users: userStorage.getAll(),
      vehicles: vehicleStorage.getAll(),
      clients: clientStorage.getAll(),
      banks: bankStorage.getAll(),
      simulations: simulationStorage.getAll(),
      proposals: proposalStorage.getAll(),
      receipts: receiptStorage.getAll(),
      sales: saleStorage.getAll(),
      activityLog: activityLog.getAll(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },
  import: (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (data.users) setItem(STORAGE_KEYS.USERS, data.users);
      if (data.vehicles) setItem(STORAGE_KEYS.VEHICLES, data.vehicles);
      if (data.clients) setItem(STORAGE_KEYS.CLIENTS, data.clients);
      if (data.banks) setItem(STORAGE_KEYS.BANKS, data.banks);
      if (data.simulations) setItem(STORAGE_KEYS.SIMULATIONS, data.simulations);
      if (data.proposals) setItem(STORAGE_KEYS.PROPOSALS, data.proposals);
      if (data.receipts) setItem(STORAGE_KEYS.RECEIPTS, data.receipts);
      if (data.sales) setItem(STORAGE_KEYS.SALES, data.sales);
      if (data.activityLog) setItem(STORAGE_KEYS.ACTIVITY_LOG, data.activityLog);
      return true;
    } catch {
      return false;
    }
  },
};
