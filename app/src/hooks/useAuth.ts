import { useState } from "react";
import { LoginCredentials, AuthResponse } from "../types/auth.types";
import { authApi } from "../api/auth";
import { useAuthContext } from "../contexts/AuthContext";
// import { useNavigate } from "react-router-dom";
import { useDB } from "@/contexts/DBContext";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateAuth } = useAuthContext();
  const { closeUserDB } = useDB();
  // const navigate = useNavigate();

  const login = async (params: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(params);
      const { token, user } = response as AuthResponse;
  
      // Set localStorage items
      localStorage.setItem('token', token);
      localStorage.setItem('sync-frequency', '0');
  
      // Update state
      updateAuth(user, token);

    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An error occurred during login';
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
    // navigate("/login");
  };

  return { login, logout, isLoading, error };
};
