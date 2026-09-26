import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | Date, pattern = 'yyyy-MM-dd HH:mm'): string {
  if (!dateString) return '-';
  try {
    const d = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(d, pattern);
  } catch {
    return String(dateString);
  }
}

export function formatShortDate(dateString?: string | Date): string {
  return formatDate(dateString, 'MMM dd, yyyy');
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function generateId(prefix = 'ID'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateDocNumber(prefix: 'REC' | 'DEL' | 'TRF' | 'ADJ', sequence?: number): string {
  const year = 2026;
  const num = sequence !== undefined ? sequence : Math.floor(1 + Math.random() * 999);
  const padded = String(num).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}
