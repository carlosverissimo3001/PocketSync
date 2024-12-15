import api from './axios';
import { LoginCredentials } from '../types/auth.types';

const BASE_URL = '/users';

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
    this.message = message;
  }
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    try {
      const response = await api.post(`${BASE_URL}/login`, credentials);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new AuthError(error.response.data.message);
      }
      throw new AuthError('An error occurred while signing in.');
    }
  },

  register: async (credentials: LoginCredentials) => {
    try {
      const response = await api.post(`${BASE_URL}/register`, credentials);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 409) {
        throw new AuthError(error.response.data.message);
      }
      throw new AuthError('An error occurred while registering.');
    }
  },

  verifyToken: async (token: string) => {
    try {
      const response = await api.post(`${BASE_URL}/verify-token`, { token });
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
}; 