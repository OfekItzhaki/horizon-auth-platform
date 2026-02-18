import { apiClient } from '../utils/api-client';
import { ListShare, ShareListDto, ToDoList } from '../types';

export class SharingService {
  /**
   * Share a list with a user
   */
  async shareList(todoListId: string, data: ShareListDto): Promise<ListShare> {
    return apiClient.post<ListShare>(`/list-shares/todo-list/${todoListId}`, data);
  }

  /**
   * Get all lists shared with a user
   */
  async getSharedLists(userId: string): Promise<ToDoList[]> {
    return apiClient.get<ToDoList[]>(`/list-shares/user/${userId}`);
  }

  /**
   * Get all users a list is shared with
   */
  async getListShares(todoListId: string): Promise<ListShare[]> {
    return apiClient.get<ListShare[]>(`/list-shares/todo-list/${todoListId}`);
  }

  /**
   * Unshare a list with a user
   */
  async unshareList(todoListId: string, userId: string): Promise<void> {
    return apiClient.delete<void>(`/list-shares/todo-list/${todoListId}/user/${userId}`);
  }
}

export const sharingService = new SharingService();
