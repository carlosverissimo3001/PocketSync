import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/auth.types';
import { authApi } from '../api/auth';
import { AuthResponse } from '../types/auth.types';
import { LoadingOverlay } from '../components/misc/LoadingOverlay';

interface AuthContextType {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string, rememberMe?: boolean) => void;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setIsInitialized: (value: boolean) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  });

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!storedToken) {
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      const response = await authApi.verifyToken(storedToken);
      
      if (response) {
        // Server responded
        const { isValid, user } = response as AuthResponse;
        if (isValid) {
          handleSetUser(user);
          handleSetToken(storedToken);
        } else {
          handleSetUser(null);
          handleSetToken('');
        }
      }
      // Server is down - do nothing, keep existing state from storage
      
      setIsInitialized(true);
      setIsLoading(false);
    };

    verifyAuth();
  }, []);

  const handleSetToken = (newToken: string) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
    }
  };

  const handleSetUser = (newUser: User | null) => {
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
    }
    setUser(newUser);
  };

  const value = {
    user,
    token,
    setUser: handleSetUser,
    setToken: handleSetToken,
    isAuthenticated: !!user && !!token,
    isInitialized,
    setIsInitialized,
    isLoading
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}; 