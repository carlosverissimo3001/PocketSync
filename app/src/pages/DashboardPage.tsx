import { useAuthContext } from "@/contexts/AuthContext";
import { List } from "@/types/list.types";
import { ListDashboard } from "@/components/list/ListDashboard";
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import { NewListCard } from "@/components/list/NewListCard";
const mockedLists: List[] = [
  {
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
  },
  {
    id: "2",
    name: "Work Tasks",
    createdAt: new Date("2024-11-12"),
    ownerId: "",
    items: [],
  },
];

export const DashboardPage = () => {
  const { user } = useAuthContext();
  const [lists, setLists] = useState<List[]>(mockedLists);


  const submitListHandler = (listName: string) => {
    const newList: List = {
      id: uuidv4(),
      name: listName,
      createdAt: new Date(),
      ownerId: user?.id || "",
      items: [],
    }
    console.log(newList);
    setLists(prevLists => [...prevLists, newList]);
  }

  const updateListHandler = (updatedList: List) => {
    setLists(prevLists => 
      prevLists.map(list => 
        list.id === updatedList.id ? updatedList : list
      )
    );
  }

  const deleteListHandler = (listId: string) => {
    setLists(prevLists => prevLists.filter(list => list.id !== listId));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">          
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
            Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{user?.username}</span>
          </h1>
        </div>

        <div className="break-inside-avoid mb-6 hover:scale-102 transition-transform flex justify-center">
          <NewListCard onAdd={submitListHandler} />
        </div>
        
        <div className="mt-6">
          <ListDashboard 
            initialLists={lists}
            onUpdateList={updateListHandler}
            onDeleteList={deleteListHandler}
          />
        </div>
      </div>
    </div>
  );
};
