import { authClient } from '../utils/api-client';
import { User, CreateUserDto, UpdateUserDto } from '../types';

export class UsersService {
  /**
   * Register a new user
   */
  async create(data: CreateUserDto): Promise<User> {
    return authClient.post<User>('/users', data);
  }

  /**
   * Get current authenticated user
   */
  async getCurrent(): Promise<User> {
    return authClient.get<User>('/users/me');
  }

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User> {
    return authClient.get<User>(`/users/${id}`);
  }

  /**
   * Update user profile
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    return authClient.patch<User>(`/users/${id}`, data);
  }

  /**
   * Soft delete user account
   */
  async delete(id: string): Promise<User> {
    return authClient.delete<User>(`/users/${id}`);
  }

  /**
   * Upload profile picture
   */
  async uploadAvatar(id: string, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);

    return authClient.post<User>(`/users/${id}/upload-avatar`, formData);
  }
}

export const usersService = new UsersService();
