import api from './axios';
import { LoginCredentials } from '../types/auth.types';

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    try {
      const response = await api.post('/login', credentials);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 403) {
        throw new AuthError('Please verify your email before logging in.');
      }
      if (error?.response?.status === 401) {
        throw new AuthError('Invalid email or password.');
      }
      throw new AuthError('An error occurred while signing in.');
    }
  },

  verifyToken: async (token: string) => {
    try {
      const response = await api.post('/login/verify-token', { token });
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
}; 