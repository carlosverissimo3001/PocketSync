import { useState } from "react";
import { LoginCredentials, AuthResponse } from "../types/auth.types";
import { authApi } from "../api/auth";
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useDB } from "@/contexts/DBContext";
export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setUser, setToken } = useAuthContext();
    const { closeUserDB } = useDB();
    const navigate = useNavigate();

    const login = async (params: LoginCredentials) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await authApi.login(params);
            const { token, user } = response as AuthResponse;

            setUser(user);
            setToken(token);
                        
     
            navigate('/dashboard');
        
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await closeUserDB();
        setUser(null);
        setToken('');
        navigate('/login');
    };

    return { login, logout, isLoading, error };
};