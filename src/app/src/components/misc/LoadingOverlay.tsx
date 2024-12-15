import { Spinner } from './Spinner';

export const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
        <Spinner />
        <p className="text-gray-700 dark:text-gray-200 font-medium">Loading...</p>
      </div>
    </div>
  );
}; 