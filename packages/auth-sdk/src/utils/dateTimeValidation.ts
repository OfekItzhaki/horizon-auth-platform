/**
 * Validation helpers for task due dates and reminder date/time fields.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Validate task due date (YYYY-MM-DD). Empty is valid (clears due date).
 * Past dates are allowed (e.g. overdue tasks).
 */
export function validateDueDate(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: true };

  if (!YYYY_MM_DD.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid date format. Use YYYY-MM-DD.',
    };
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date.' };
  }

  const [y, m, d] = trimmed.split('-').map(Number);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { valid: false, error: 'Invalid date.' };
  }

  return { valid: true };
}

/**
 * Validate reminder time (HH:mm, 24h).
 */
export function validateTime(value: string): ValidationResult {
  const t = (value || '').trim();
  if (!t) {
    return { valid: false, error: 'Time is required.' };
  }
  if (!HH_MM.test(t)) {
    return { valid: false, error: 'Invalid time. Use HH:mm (e.g. 09:00, 14:30).' };
  }
  return { valid: true };
}

/**
 * Validate custom reminder date (YYYY-MM-DD). Required, must be valid and not in the past.
 */
export function validateCustomReminderDate(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: 'Date is required for custom date reminders.' };
  }

  if (!YYYY_MM_DD.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid date format. Use YYYY-MM-DD.',
    };
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date.' };
  }

  const [y, m, d] = trimmed.split('-').map(Number);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { valid: false, error: 'Invalid date.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  if (date < today) {
    return { valid: false, error: 'Reminder date cannot be in the past.' };
  }

  return { valid: true };
}

/**
 * Validate "days before due date" (non‑negative integer). Empty is valid (optional).
 */
export function validateDaysBefore(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: true };

  // Check if it's a numeric string and an integer
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Days before must be a non-negative integer.' };
  }

  const n = Number(trimmed);
  if (Number.isNaN(n) || !Number.isInteger(n) || n < 0) {
    return { valid: false, error: 'Days before must be a non-negative number (e.g. 0, 1, 7).' };
  }
  return { valid: true };
}

/**
 * Normalize time to HH:mm, or undefined if invalid.
 */
export function normalizeTime(value: string): string | undefined {
  const t = (value || '').trim();
  if (!HH_MM.test(t)) return undefined;
  const [h, m] = t.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
