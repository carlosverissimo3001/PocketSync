import { LoginForm } from "../components/auth/LoginForm";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import { LoadingOverlay } from "../components/misc/LoadingOverlay";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export const LoginPage = () => {
  const { user, token, isInitialized, isLoading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (location.state?.registrationSuccess) {
      setShowSuccess(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (isInitialized && !isLoading && user && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, token, isInitialized, isLoading, navigate]);

  if (!isInitialized || isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 p-10 rounded-xl shadow-lg">
        <div className="text-center space-y-3">
        {showSuccess && (
          <Alert className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 p-1">
            <AlertDescription className="ml-2 text-sm font-medium">
              Registration successful! Please login.
            </AlertDescription>
          </Alert>
        )}
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Welcome!!
          </h2>
        </div>
        <LoginForm />

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?
          </p>
          <Link
            to="/register"
            className="mt-3 inline-flex justify-center items-center px-6 py-2.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};