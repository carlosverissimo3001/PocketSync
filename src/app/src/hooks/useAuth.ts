import { useState } from "react";
import { LoginCredentials, AuthResponse, RegisterResponse } from "../types/auth.types";
import { authApi } from "../api/auth";
import { useAuthContext } from "../contexts/AuthContext";
import { useDB } from "@/contexts/DBContext";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateAuth } = useAuthContext();
  const { closeUserDB } = useDB();

  const login = async (params: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(params);
      const { token, user } = response as AuthResponse;
  
      localStorage.setItem('token', token);
      localStorage.setItem('sync-frequency', '0');
  
      updateAuth(user, token);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An error occurred during login';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.register(params);
      const { success, message } = response as RegisterResponse;
      if (!success) {
        setError(message || 'An error occurred during registration');
        throw new Error(message || 'An error occurred during registration');
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An error occurred during registration';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await closeUserDB();
    updateAuth(null, "");
    localStorage.removeItem('sync-frequency');
  };

  return { login, register, logout, isLoading, error };
};
