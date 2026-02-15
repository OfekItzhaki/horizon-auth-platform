import { apiClient } from '../utils/api-client';
import { ToDoList, Task, TrashResponse, UpdateProfilePictureResponse } from '../types';

export class MeService {
  /**
   * Get my lists
   */
  async getLists(): Promise<ToDoList[]> {
    return apiClient.get<ToDoList[]>('/me/lists');
  }

  /**
   * Get my tasks
   */
  async getTasks(todoListId?: string): Promise<Task[]> {
    const path = todoListId ? `/me/tasks?todoListId=${todoListId}` : '/me/tasks';
    return apiClient.get<Task[]>(path);
  }

  /**
   * Get my trash (deleted items)
   */
  async getTrash(): Promise<TrashResponse> {
    return apiClient.get<TrashResponse>('/me/trash');
  }

  /**
   * Update profile picture
   */
  async uploadProfilePicture(file: File): Promise<UpdateProfilePictureResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post<UpdateProfilePictureResponse>('/me/profile-picture', formData);
  }
}

export const meService = new MeService();
