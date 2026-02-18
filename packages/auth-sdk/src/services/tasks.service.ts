import { apiClient } from '../utils/api-client';
import { Task, CreateTaskDto, UpdateTaskDto } from '../types';

export class TasksService {
  /**
   * Get all tasks (optionally filtered by list)
   */
  async getAll(todoListId?: string): Promise<Task[]> {
    const path = todoListId ? `/tasks?todoListId=${todoListId}` : '/tasks';
    return apiClient.get<Task[]>(path);
  }

  /**
   * Get tasks for a specific date
   */
  async getByDate(date?: string): Promise<Task[]> {
    if (date) {
      const encodedDate = encodeURIComponent(date);
      return apiClient.get<Task[]>(`/tasks/by-date?date=${encodedDate}`);
    }
    return apiClient.get<Task[]>('/tasks/by-date');
  }

  /**
   * Get task by ID
   */
  async getById(id: string): Promise<Task> {
    return apiClient.get<Task>(`/tasks/${id}`);
  }

  /**
   * Create a task in a list
   */
  async create(todoListId: string, data: CreateTaskDto): Promise<Task> {
    return apiClient.post<Task>(`/tasks/todo-list/${todoListId}`, data);
  }

  /**
   * Update task
   */
  async update(id: string, data: UpdateTaskDto): Promise<Task> {
    return apiClient.patch<Task>(`/tasks/${id}`, data);
  }

  /**
   * Delete task (soft delete)
   */
  async delete(id: string): Promise<Task> {
    return apiClient.delete<Task>(`/tasks/${id}`);
  }

  /**
   * Reorder tasks (updates the order property)
   */
  async reorderTasks(tasks: { id: string; order: number }[]): Promise<void> {
    // Sequentially update for simplicity and to avoid race conditions on order
    for (const task of tasks) {
      await this.update(task.id, { order: task.order });
    }
  }

  /**
   * Bulk update tasks
   */
  async bulkUpdate(ids: string[], data: UpdateTaskDto): Promise<void> {
    await Promise.all(ids.map((id) => this.update(id, data)));
  }

  /**
   * Bulk delete tasks
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.delete(id)));
  }

  /**
   * Get user's tasks (optionally filtered by list)
   */
  async getMyTasks(todoListId?: string): Promise<Task[]> {
    const path = todoListId ? `/me/tasks?todoListId=${todoListId}` : '/me/tasks';
    return apiClient.get<Task[]>(path);
  }
}

export const tasksService = new TasksService();
