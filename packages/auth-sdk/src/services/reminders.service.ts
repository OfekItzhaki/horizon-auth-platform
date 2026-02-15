import { apiClient } from '../utils/api-client';
import { ReminderNotification } from '../types';

export class RemindersService {
  /**
   * Get reminder notifications for today
   */
  async getToday(): Promise<ReminderNotification[]> {
    return apiClient.get<ReminderNotification[]>('/reminders/today');
  }

  /**
   * Get reminder notifications for a specific date
   */
  async getByDate(date: string): Promise<ReminderNotification[]> {
    const encodedDate = encodeURIComponent(date);
    return apiClient.get<ReminderNotification[]>(`/reminders/date?date=${encodedDate}`);
  }

  /**
   * Get reminder notifications for a date range
   */
  async getByRange(startDate: string, endDate: string): Promise<ReminderNotification[]> {
    const encodedStartDate = encodeURIComponent(startDate);
    const encodedEndDate = encodeURIComponent(endDate);
    return apiClient.get<ReminderNotification[]>(
      `/reminders/range?startDate=${encodedStartDate}&endDate=${encodedEndDate}`,
    );
  }
}

export const remindersService = new RemindersService();
