import { apiClient } from '../utils/api-client';
import { TaskShare, ShareTaskDto, ShareRole } from '../types';

export class TaskSharingService {
    /**
     * Share a task with a user
     */
    async shareTask(taskId: string, data: ShareTaskDto): Promise<TaskShare> {
        return apiClient.post<TaskShare>(`/task-shares/${taskId}/share`, data);
    }

    /**
     * Get all users a task is shared with
     */
    async getTaskShares(taskId: string): Promise<TaskShare[]> {
        return apiClient.get<TaskShare[]>(`/task-shares/${taskId}/shares`);
    }

    /**
     * Unshare a task with a user
     */
    async unshareTask(taskId: string, userId: string): Promise<void> {
        return apiClient.delete<void>(`/task-shares/${taskId}/share/${userId}`);
    }

    /**
     * Update share role for a user
     */
    async updateShareRole(taskId: string, userId: string, role: ShareRole): Promise<TaskShare> {
        return apiClient.patch<TaskShare>(`/task-shares/${taskId}/share/${userId}/role`, { role });
    }

    /**
     * Get all tasks shared with the current user
     */
    async getTasksSharedWithMe(): Promise<TaskShare[]> {
        return apiClient.get<TaskShare[]>('/task-shares/my-shared-tasks');
    }
}

export const taskSharingService = new TaskSharingService();
