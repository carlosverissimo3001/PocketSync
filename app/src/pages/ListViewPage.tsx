import { ListCard } from "@/components/list/ListCard";
import { List } from "@/types/list.types";
//import { useParams } from "react-router-dom";

export const ListViewPage = () => {
  const mockedList: List = {
    id: "1",
    name: "Groceries",
    createdAt: new Date("2024-11-10"),
    ownerId: "1",
    items: [
      {
        id: "1",
        name: "Milk",
        quantity: 2,
        checked: false,
        listId: "1",
      },
      {
        id: "2",
        name: "Bread",
        quantity: 1,
        checked: false,
        listId: "1",
      }
    ],
  };

  const list = null;

  // TODO: Get list from API
  // In the query, let's do include: user
  // so that in the FE, we can display the owner's name
  //const { listId } = useParams();
  const userNameMocked = "John Doe";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {list ? (
          <>
          <div className="text-center mb-6">          
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              You are viewing <span className="text-indigo-600 dark:text-indigo-400">{userNameMocked}'s</span> list
            </h1>
          </div>
            <ListCard list={list} updateList={() => {}} handleDelete={() => {}} isOwner={false} />
          </>
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <span className="text-6xl">🔍</span>
            </div>          
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
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
        )}
      </div>
    </div>
  );
};

