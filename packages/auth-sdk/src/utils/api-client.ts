import { getApiUrl, getAuthUrl } from '../config';
import { TokenStorage } from './storage';
import { ApiError } from '../types';

export class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<any> | null = null;

  constructor(private urlResolver: (path: string) => string = getApiUrl) { }

  private async request<T>(method: string, path: string, options: RequestInit = {}): Promise<T> {
    const url = this.urlResolver(path);
    const token = TokenStorage.getToken();

    const { headers: optionsHeaders, method: optionsMethod, ...restOptions } = options;
    const isFormData = restOptions.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(optionsHeaders as Record<string, string>),
    };

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    } else if (isFormData && headers['Content-Type']) {
      delete headers['Content-Type'];
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...restOptions,
      method,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
        return this.handleUnauthorized<T>(method, path, options);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw {
            statusCode: response.status,
            message: 'Invalid JSON response from server',
            error: 'JSON_PARSE_ERROR',
          } as ApiError;
        }
        throw parseError;
      }

      if (!response.ok) {
        const error: ApiError = {
          statusCode: response.status,
          message: data?.message || 'An error occurred',
          error: data?.error,
        };
        throw error;
      }

      return data;
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw {
          statusCode: 0,
          message: 'Network error: Could not connect to the server',
        } as ApiError;
      }

      throw {
        statusCode: 0,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      } as ApiError;
    }
  }

  private async handleUnauthorized<T>(
    method: string,
    path: string,
    options: RequestInit,
  ): Promise<T> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshPromise = this.refreshToken();
    }

    try {
      await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;
      return this.request<T>(method, path, options);
    } catch (refreshError) {
      this.isRefreshing = false;
      this.refreshPromise = null;
      TokenStorage.removeToken();
      throw refreshError;
    }
  }

  private async refreshToken(): Promise<any> {
    const url = this.urlResolver('/auth/refresh');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw {
        statusCode: response.status,
        message: 'Session expired',
        error: 'REFRESH_TOKEN_EXPIRED',
      } as ApiError;
    }

    const data = await response.json();
    TokenStorage.setToken(data.accessToken);
    return data;
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>('POST', path, {
      ...options,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('PATCH', path, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }
}

export const apiClient = new ApiClient(getApiUrl);
export const authClient = new ApiClient(getAuthUrl);
