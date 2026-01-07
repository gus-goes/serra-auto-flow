// ============================================
// LEGACY STORAGE UTILITIES
// ============================================
// Este arquivo contém funções utilitárias legadas.
// O armazenamento de dados foi migrado para Supabase (Lovable Cloud).
// As funções de storage abaixo são mantidas apenas para compatibilidade
// com os geradores de PDF que ainda não foram completamente migrados.

// Generate unique ID (legacy - prefer database generated UUIDs)
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate proposal/receipt number (legacy - use database function generate_document_number instead)
export function generateNumber(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}${year}${month}${random}`;
}

// ============================================
// STUB STORAGE OBJECTS (for PDF compatibility)
// These return empty data - PDF generators should receive data as parameters
// ============================================

export const clientStorage = {
  getById: (_id: string) => null,
  getAll: () => [],
};

export const vehicleStorage = {
  getById: (_id: string) => null,
  getAll: () => [],
};

export const userStorage = {
  getById: (_id: string) => null,
  getAll: () => [],
};

export const bankStorage = {
  getById: (_id: string) => null,
  getAll: () => [],
};
