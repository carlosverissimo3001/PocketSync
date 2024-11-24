import { ListExtended } from "@/types/list.types";
import { useList } from "@/hooks/useList";
import { useParams } from "react-router-dom";
import { LoadingOverlay } from "@/components/misc/LoadingOverlay";
import { useAuthContext } from "@/contexts/AuthContext";
import { ListCardSingle } from "@/components/list/ListCardSingle";

export const ListViewPage = () => {
  const { id } = useParams();
  const { user } = useAuthContext();
  const { data, isLoading } = useList(id!);

  if (isLoading) return <LoadingOverlay />
  
  // Move this check before trying to use the data
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <div className="text-center">
            <div className="mb-8">
              <span className="text-6xl">🔍</span>
            </div>          
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Oops! This list is playing hide and seek
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-8">
              We've looked everywhere, but we couldn't find the list you're looking for.
            </p>
            <div className="flex justify-center gap-4">
              <a 
                href="/" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ← Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const list = data as ListExtended;
  const isOwner = list.ownerId === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {isOwner ? (
          <div className="text-center mb-12">          
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Your List
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
              Manage and organize your items here
            </p>
          </div>
        ) : (
          <div className="text-center mb-12">
            <div className="mb-4">
              <span className="inline-block p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full">
                <span className="text-4xl">🤝</span>
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              You've found <span className="text-indigo-600 dark:text-indigo-400">{list.owner.username}'s</span> list!
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              You can view and collaborate on this shared list
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <button 
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
              >
                ← Go Back
              </button>
              <a 
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Dashboard
              </a>
            </div>
          </div>
        )}
        
        <div className="max-w-md mx-auto">
          <ListCardSingle list={list}/>
        </div>
      </div>
    </div>
  );
};

