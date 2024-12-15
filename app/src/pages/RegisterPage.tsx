import { RegisterForm } from "@/components/auth/RegisterForm";
import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const RegisterPage = () => {
    const { user, token, isInitialized, isLoading } = useAuthContext();
    const navigate = useNavigate();

    useEffect(() => {
        if (isInitialized && !isLoading && user && token) {
          navigate('/dashboard', { replace: true });
        }
      }, [user, token, isInitialized, isLoading, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 p-10 rounded-xl shadow-lg">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Create an account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              Or{" "}
              <a
                href="/login"
                className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                sign in
              </a>
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    );
  };
  