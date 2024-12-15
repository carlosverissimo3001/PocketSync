import { RegisterForm } from "@/components/auth/RegisterForm";

export const RegisterPage = () => {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 to-blue-800 dark:from-gray-900 dark:to-gray-800 p-6"> {/* Changed gradient */}
        <div className="max-w-md w-full space-y-8 bg-[#1E293B] p-10 rounded-xl shadow-lg border border-indigo-500/20"> {/* Added border */}
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-bold text-white tracking-tight">
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
  