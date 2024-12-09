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
  
  // Not Found State
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-xl mx-auto px-4">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center blur-2xl opacity-50">
                <span className="text-8xl">🔍</span>
              </div>
              <span className="relative text-8xl">🔍</span>
            </div>          
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              List Not Found
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              The shopping list you're looking for might have been deleted or never existed.
            </p>
            <a 
              href="/" 
              className="inline-flex items-center px-6 py-3 text-lg font-medium rounded-full
                text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 
                hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                focus:ring-indigo-500 transform transition-all hover:scale-105 shadow-lg"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (data.deleted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">
          This shared list is no longer available 💔
    </p>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      The owner of this list has deleted it
        </p>
      </div>
    );
  }

  const list = data as ListExtended;
  const isOwner = list.ownerId === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {isOwner ? (
          <div className="text-center space-y-4 mb-16">          
            <div className="inline-block mb-4">
              <div className="relative">
                <div className="absolute inset-0 blur-xl opacity-50 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full" />
                <span className="relative text-5xl">👀</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
              Preview Mode
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              This is how your list appears to others. They can add and remove items when you share the link.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-6 mb-16">
            <div className="inline-block">
              <div className="relative p-4">
                <div className="absolute inset-0 blur-xl opacity-50 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full" />
                <span className="relative text-5xl">🤝</span>
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Collaborating with{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                  {list.owner.username}
                </span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Feel free to edit this shared list
              </p>
            </div>
            <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={() => window.history.back()}
                className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 
                  dark:hover:text-white focus:outline-none transition-colors"
              >
                ← Go Back
              </button>
              <a 
                href="/"
                className="px-6 py-2 rounded-full text-white bg-gradient-to-r from-indigo-500 
                  to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none 
                  focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all 
                  hover:scale-105 shadow-lg"
              >
                Dashboard
              </a>
            </div>
          </div>
        )}
        
        <div className="max-w-md mx-auto transform transition-all hover:scale-[1.01]">
          <ListCardSingle list={list}/>
        </div>
      </div>
    </div>
  );
};

