import { LoginForm } from "../components/auth/LoginForm";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import { LoadingOverlay } from "../components/misc/LoadingOverlay";
import { useEffect } from "react";

export const LoginPage = () => {
  const { user, token, isInitialized, isLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized && !isLoading && user && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, token, isInitialized, isLoading, navigate]);

  if (!isInitialized || isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 dark:from-gray-900 dark:to-gray-800 p-6"> {/* Different gradient */}
      <div className="max-w-md w-full space-y-8 bg-[#1E293B] p-10 rounded-xl shadow-lg border border-slate-500/20"> {/* Different border */}
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-bold text-white tracking-tight">
            Welcome Back!
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
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};