import { apiClient } from '../utils/api-client';
import { Step, CreateStepDto, UpdateStepDto, ReorderStepsDto } from '../types';

export class StepsService {
  /**
   * Get all steps for a task
   */
  async getByTask(taskId: string): Promise<Step[]> {
    return apiClient.get<Step[]>(`/tasks/${taskId}/steps`);
  }

  /**
   * Create a new step
   */
  async create(taskId: string, data: CreateStepDto): Promise<Step> {
    return apiClient.post<Step>(`/tasks/${taskId}/steps`, data);
  }

  /**
   * Update step
   */
  async update(id: string, data: UpdateStepDto): Promise<Step> {
    return apiClient.patch<Step>(`/steps/${id}`, data);
  }

  /**
   * Delete step (soft delete)
   */
  async delete(id: string): Promise<Step> {
    return apiClient.delete<Step>(`/steps/${id}`);
  }

  /**
   * Reorder steps for a task
   */
  async reorder(taskId: string, stepIds: string[]): Promise<Step[]> {
    return apiClient.patch<Step[]>(`/tasks/${taskId}/steps/reorder`, {
      stepIds,
    } as ReorderStepsDto);
  }
}

export const stepsService = new StepsService();
