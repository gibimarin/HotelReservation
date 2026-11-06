import { apiClient } from './client';
import type { User, ApiResponse } from '../types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: User;
  token: string;
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponseData> => {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>(
      '/auth/register',
      payload
    );
    return res.data.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponseData> => {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>(
      '/auth/login',
      payload
    );
    return res.data.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return res.data.data.user;
  },
};
