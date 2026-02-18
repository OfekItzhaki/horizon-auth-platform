import { authService } from './auth.service';
import { User } from '../types';

/**
 * Extracted User Service logic
 */
export class UsersService {
  async getCurrentUser(): Promise<User> {
    // In a real app, this would be an API call
    // For now, return a mock or decode JWT
    const token = authService.getToken();
    if (!token) throw new Error('No token');

    // Mocking for now
    return {
      id: 'mock-uuid',
      email: 'user@example.com',
      name: 'Mock User',
      emailVerified: true
    };
  }
}

export const usersService = new UsersService();
