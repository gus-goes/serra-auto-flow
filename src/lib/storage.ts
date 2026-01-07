// ============================================
// LEGACY STORAGE UTILITIES
// ============================================
// Este arquivo contém apenas funções utilitárias legadas.
// O armazenamento de dados foi migrado para Supabase (Lovable Cloud).
// Todas as operações de dados agora são feitas através de hooks React Query.

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
