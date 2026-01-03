/**
 * Date utility functions for consistent date handling across the system.
 * All dates are stored internally as YYYY-MM-DD strings to avoid timezone issues.
 * Never use toISOString() for form dates - it causes timezone offset problems.
 */

/**
 * Get current date as YYYY-MM-DD string (no timezone issues)
 */
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current datetime as ISO string for timestamps
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse a date string (YYYY-MM-DD) to local date object
 * This avoids timezone offset issues by parsing as local time
 */
export function parseDateString(dateStr: string): Date {
  // Handle full ISO strings with time component
  if (dateStr.includes('T')) {
    // Extract just the date part
    dateStr = dateStr.split('T')[0];
  }
  
  // Parse as local date (not UTC)
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format date to DD/MM/YYYY for display
 */
export function formatDateDisplay(dateStr: string | Date): string {
  if (!dateStr) return '';
  
  let date: Date;
  
  if (typeof dateStr === 'string') {
    date = parseDateString(dateStr);
  } else {
    date = dateStr;
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format datetime to DD/MM/YYYY HH:mm for display
 */
export function formatDateTimeDisplay(dateStr: string | Date): string {
  if (!dateStr) return '';
  
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Convert Date object to YYYY-MM-DD string for storage
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate if string is in YYYY-MM-DD format
 */
export function isValidDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = parseDateString(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Get full date string in Portuguese for PDFs
 * Example: "03 de janeiro de 2026"
 */
export function formatDateFullPtBr(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? parseDateString(dateStr) : dateStr;
  
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} de ${month} de ${year}`;
}
