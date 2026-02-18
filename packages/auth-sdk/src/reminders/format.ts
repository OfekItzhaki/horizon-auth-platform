/**
 * Format reminder for display (shared: web + mobile).
 * Optional i18n `t` for web; mobile can omit it.
 */

import type { ReminderConfig } from './types';
import { ReminderTimeframe, ReminderSpecificDate, DAY_NAMES } from './types';

type T = ((key: string, opts?: { defaultValue?: string; count?: number }) => string) | undefined;

export interface FormatReminderOptions {
  /** When false, times are shown in 12h (e.g. 9:00 AM). When true, 24h (e.g. 09:00). Default: true. */
  use24h?: boolean;
}

/**
 * Format a time string (HH:mm) for display.
 * @param timeStr - 24h time like "09:00" or "14:30"
 * @param use24h - true = "09:00" / "14:30", false = "9:00 AM" / "2:30 PM"
 */
export function formatTimeForDisplay(timeStr: string, use24h: boolean): string {
  const t = (timeStr || '09:00').trim();
  const [hPart, mPart] = t.split(':');
  const hours = parseInt(hPart || '9', 10);
  const minutes = parseInt(mPart || '0', 10);
  if (use24h) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export function formatReminderDisplay(
  reminder: ReminderConfig,
  t?: T,
  options?: FormatReminderOptions,
): string {
  const use24h = options?.use24h !== false;
  const rawTime = reminder.time || '09:00';
  const timeStr = formatTimeForDisplay(rawTime, use24h);
  let description = '';

  if (reminder.daysBefore != null && reminder.daysBefore > 0) {
    const daysText = reminder.daysBefore === 1 ? 'day' : 'days';
    return t
      ? `${reminder.daysBefore} ${t('reminders.daysBefore', { count: reminder.daysBefore, defaultValue: daysText })} ${t('reminders.beforeDueDate', { defaultValue: 'before due date' })} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
      : `${reminder.daysBefore} ${daysText} before due date at ${timeStr}`;
  }

  switch (reminder.timeframe) {
    case ReminderTimeframe.SPECIFIC_DATE:
      if (reminder.specificDate === ReminderSpecificDate.START_OF_WEEK) {
        description = t
          ? `${t('reminders.everyMonday', { defaultValue: 'Every Monday' })} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
          : `Every Monday at ${timeStr}`;
      } else if (reminder.specificDate === ReminderSpecificDate.START_OF_MONTH) {
        description = t
          ? `${t('reminders.firstOfMonth', { defaultValue: '1st of every month' })} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
          : `1st of every month at ${timeStr}`;
      } else if (reminder.specificDate === ReminderSpecificDate.START_OF_YEAR) {
        description = t
          ? `${t('reminders.janFirst', { defaultValue: 'Jan 1st every year' })} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
          : `Jan 1st every year at ${timeStr}`;
      } else if (reminder.customDate) {
        const date = new Date(reminder.customDate);
        description = `${date.toLocaleDateString()} at ${timeStr}`;
      } else {
        description = t
          ? `${t('reminders.specificDate', { defaultValue: 'Specific date' })} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
          : `Specific date at ${timeStr}`;
      }
      break;
    case ReminderTimeframe.EVERY_DAY:
      description = t
        ? `${t('reminders.everyDay', { defaultValue: 'Every day' })} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
        : `Every day at ${timeStr}`;
      break;
    case ReminderTimeframe.EVERY_WEEK: {
      const dayName = reminder.dayOfWeek != null ? DAY_NAMES[reminder.dayOfWeek] : 'Monday';
      description = t
        ? `${t('reminders.every', { defaultValue: 'Every' })} ${dayName} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
        : `Every ${dayName} at ${timeStr}`;
      break;
    }
    case ReminderTimeframe.EVERY_MONTH:
      description = t
        ? `${t('reminders.firstOfMonth', { defaultValue: '1st of every month' })} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
        : `1st of every month at ${timeStr}`;
      break;
    case ReminderTimeframe.EVERY_YEAR:
      description = t
        ? `${t('reminders.sameDateYearly', { defaultValue: 'Same date every year' })} ${t('reminders.at', { defaultValue: 'at' })} ${timeStr}`
        : `Same date every year at ${timeStr}`;
      break;
  }

  return description;
}
