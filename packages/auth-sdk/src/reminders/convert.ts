/**
 * Convert between backend reminder format and ReminderConfig (shared: web + mobile).
 */

import type { ReminderConfig } from './types';
import { ReminderTimeframe } from './types';

export function convertBackendToReminders(
  reminderDaysBefore: number[] | undefined,
  specificDayOfWeek: number | null | undefined,
  dueDate: string | null | undefined,
  reminderConfig?: unknown,
): ReminderConfig[] {
  const reminders: ReminderConfig[] = [];

  // 1. Process reminderConfig first (it has the most data: hasAlarm, location, etc.)
  if (reminderConfig != null) {
    let parsed: unknown = reminderConfig;
    if (typeof reminderConfig === 'string') {
      try {
        parsed = JSON.parse(reminderConfig) as unknown;
      } catch {
        parsed = null;
      }
    }

    const push = (c: Record<string, unknown>) => {
      if (!c || !c.timeframe) return;
      const tf =
        typeof c.timeframe === 'string'
          ? (c.timeframe as ReminderTimeframe)
          : (c.timeframe as ReminderTimeframe);
      reminders.push({
        id: (c.id as string) || `reminder-${Date.now()}-${Math.random()}`,
        timeframe: tf,
        time: (c.time as string) || '09:00',
        specificDate: c.specificDate as ReminderConfig['specificDate'],
        customDate: c.customDate as string | undefined,
        dayOfWeek: c.dayOfWeek as number | undefined,
        daysBefore: c.daysBefore as number | undefined,
        hasAlarm: Boolean(c.hasAlarm),
        location: typeof c.location === 'string' ? c.location : undefined,
      });
    };

    if (Array.isArray(parsed)) {
      (parsed as Record<string, unknown>[]).forEach(push);
    } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      push(parsed as Record<string, unknown>);
    }
  }

  // 2. Process legacy fields, but avoid duplicates if they were already in reminderConfig
  if (reminderDaysBefore?.length && dueDate) {
    reminderDaysBefore.forEach((days) => {
      const exists = reminders.some(
        (r) => r.timeframe === ReminderTimeframe.SPECIFIC_DATE && r.daysBefore === days,
      );
      if (!exists) {
        reminders.push({
          id: `days-before-${days}`,
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '09:00',
          daysBefore: days,
        });
      }
    });
  }

  if (specificDayOfWeek != null && specificDayOfWeek >= 0 && specificDayOfWeek <= 6) {
    const exists = reminders.some(
      (r) => r.timeframe === ReminderTimeframe.EVERY_WEEK && r.dayOfWeek === specificDayOfWeek,
    );
    if (!exists) {
      reminders.push({
        id: `day-of-week-${specificDayOfWeek}`,
        timeframe: ReminderTimeframe.EVERY_WEEK,
        time: '09:00',
        dayOfWeek: specificDayOfWeek,
      });
    }
  }

  return reminders;
}

export function convertRemindersToBackend(
  reminders: ReminderConfig[],
  dueDate?: string,
): {
  reminderDaysBefore?: number[];
  specificDayOfWeek?: number | null;
  reminderConfig?: ReminderConfig[] | null;
} {
  const daysBefore: number[] = [];
  let dayOfWeek: number | undefined;

  // All reminders now stay in config to preserve hasAlarm, location, etc.
  const configs: ReminderConfig[] = reminders;

  reminders.forEach((r) => {
    // Keep syncing to legacy fields for backend filtering visibility
    if (r.daysBefore != null && r.daysBefore > 0 && dueDate) {
      daysBefore.push(r.daysBefore);
    }
    if (r.timeframe === ReminderTimeframe.EVERY_WEEK && r.dayOfWeek != null) {
      dayOfWeek = r.dayOfWeek;
    }
  });

  const result: {
    reminderDaysBefore?: number[];
    specificDayOfWeek?: number | null;
    reminderConfig?: ReminderConfig[] | null;
  } = {
    reminderDaysBefore: daysBefore.length ? [...new Set(daysBefore)].sort((a, b) => b - a) : [],
    specificDayOfWeek: dayOfWeek != null && dayOfWeek >= 0 && dayOfWeek <= 6 ? dayOfWeek : null,
    reminderConfig: configs.length ? configs : null,
  };

  return result;
}
