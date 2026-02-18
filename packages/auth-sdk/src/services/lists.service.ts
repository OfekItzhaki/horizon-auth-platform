import { apiClient } from '../utils/api-client';
import { ToDoList, CreateToDoListDto, UpdateToDoListDto } from '../types';

export class ListsService {
  /**
   * Get all lists for authenticated user
   */
  async getAll(): Promise<ToDoList[]> {
    return apiClient.get<ToDoList[]>('/todo-lists');
  }

  /**
   * Get list by ID
   */
  async getById(id: string): Promise<ToDoList> {
    return apiClient.get<ToDoList>(`/todo-lists/${id}`);
  }

  /**
   * Create a new list
   */
  async create(data: CreateToDoListDto): Promise<ToDoList> {
    return apiClient.post<ToDoList>('/todo-lists', data);
  }

  /**
   * Update list
   */
  async update(id: string, data: UpdateToDoListDto): Promise<ToDoList> {
    return apiClient.patch<ToDoList>(`/todo-lists/${id}`, data);
  }

  /**
   * Delete list (soft delete)
   */
  async delete(id: string): Promise<ToDoList> {
    return apiClient.delete<ToDoList>(`/todo-lists/${id}`);
  }

  /**
   * Get user's lists (alias for getAll)
   */
  async getMyLists(): Promise<ToDoList[]> {
    return apiClient.get<ToDoList[]>('/me/lists');
  }
}

export const listsService = new ListsService();
