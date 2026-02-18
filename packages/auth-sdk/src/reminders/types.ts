/**
 * Shared reminder configuration types (web-app + mobile-app).
 */

export enum ReminderTimeframe {
  SPECIFIC_DATE = 'SPECIFIC_DATE',
  EVERY_DAY = 'EVERY_DAY',
  EVERY_WEEK = 'EVERY_WEEK',
  EVERY_MONTH = 'EVERY_MONTH',
  EVERY_YEAR = 'EVERY_YEAR',
}

export enum ReminderSpecificDate {
  START_OF_WEEK = 'START_OF_WEEK',
  START_OF_MONTH = 'START_OF_MONTH',
  START_OF_YEAR = 'START_OF_YEAR',
  CUSTOM_DATE = 'CUSTOM_DATE',
}

export interface ReminderConfig {
  id: string;
  timeframe: ReminderTimeframe;
  time?: string;
  specificDate?: ReminderSpecificDate;
  customDate?: string;
  dayOfWeek?: number; // 0–6 (Sunday–Saturday)
  daysBefore?: number;
  hasAlarm?: boolean;
  /** Optional location for the reminder (e.g. address, place name). */
  location?: string;
}

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
