import { useAuthContext } from "@/contexts/AuthContext";
import { List } from "@/types/list.types";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useState } from "react";
import { NewListCard } from "@/components/list/NewListCard";
import {
  fetchListsWithItems,
  createList,
  updateList,
  deleteList,
} from "@/db/db-utils";
import { ListCard } from "@/components/list/ListCard";
import { SyncComponent } from "@/components/misc/SyncComponent";
import { useSyncLists } from "@/hooks/useList";
import { useToast } from "@/hooks/useToast";
import { ToastAction } from "@/components/ui/toast";
import useSubscriber from "@/hooks/useSubscriber";
import { useSync } from "@/contexts/SyncContext";
import { useDB } from "@/contexts/DBContext";
import { Button } from "@/components/ui/button";

export const DashboardPage = () => {
  const { user } = useAuthContext();
  const { initializeUserDB } = useDB();
  const [lists, setLists] = useState<List[]>([]);
  const { mutate: syncLists, isPending } = useSyncLists();
  const [syncFrequency, setSyncFrequency] = useState(5); // default 5 minutes
  const { toast } = useToast();
  const { lastSync, fetchLastSync } = useSync();
  const [isServerAlive, setIsServerAlive] = useState<boolean>(false);

  // Initialize DB when user is available
  useEffect(() => {
    if (user?.id) {
      initializeUserDB(user.id);
    }
  }, [user?.id, initializeUserDB]);

  // Hook to fetch last sync time
  useEffect(() => {
    if (user?.id) {
      fetchLastSync();
    }
  }, [user?.id, fetchLastSync]);

  // Hook to subscribe to socket.io events
  useSubscriber(user?.id ?? '');

  // Hook to fetch lists from local storage
  // Refetch lists when last sync time changes
  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchListsWithItems();
      setLists(data);
    };
    fetchData();
  }, [lastSync]);

  // Hook to sync lists with server based on frequency
  // Is updated when frequency or lists change
  useEffect(() => {
    const interval = setInterval(() => {
      syncLists({ lists, userId: user?.id ?? '' });
    }, syncFrequency * 60000); // To milliseconds

    return () => {
      clearInterval(interval);
    };
  }, [syncFrequency, lists, syncLists, user?.id]);

  // Check server health
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/`);
        setIsServerAlive(response.ok);
      } catch (error) {
        setIsServerAlive(false);
        console.error(error);
      }
    };

    // Initial check
    checkServerHealth();

    // Set up interval
    const interval = setInterval(checkServerHealth, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const createListHandler = async (listName: string) => {
    const newList: List = {
      id: uuidv4(),
      name: listName,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: user?.id ?? "",
      items: [],
    };

    await createList(newList);
    const updatedLists = await fetchListsWithItems();
    setLists(updatedLists);

    toast({
      title: `List "${newList.name}" created successfully!`,
      description: "Start adding items to your list",
      duration: 2000, // 2 seconds
      action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
    });
  };

  const updateListHandler = async (list: List) => {
    await updateList(list);

    const updatedLists = await fetchListsWithItems();
    setLists(updatedLists);
  };

  const deleteListHandler = async (list: List) => {
    // Optimistically update UI
    setLists(lists?.filter((l) => l.id !== list.id));
    await deleteList(list.id);
  };

  const handleSync = async () => {    
    syncLists(
      { lists, userId: user?.id ?? '' },
      {
        onSuccess: () => {
          toast({
            title: "Sync request sent 📡",
            description: "Your lists are being synced to the cloud 🌤️",
            duration: 2000,
          });

          // This will happen in the next 30 seconds either way
          // But this is ok
          if (!isServerAlive) {
            setIsServerAlive(true);
          }
        },
        onError: () => {
          toast({
            title: "Sync failed 🚨",
            description: "Looks like the clouds are not reachable right now 🌧️",
            variant: "destructive",
            duration: 3000,
          });

          // Same as above
          if (isServerAlive) {
            setIsServerAlive(false);
          }
        }
      }
    );
  };

  const handleFrequencyChange = (minutes: number) => {
    setSyncFrequency(minutes);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
            Welcome back,{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              {user?.username}
            </span>
          </h1>
        </div>

        <div className="break-inside-avoid mb-6 hover:scale-102 transition-transform flex justify-center">
          <NewListCard onAdd={createListHandler} />
        </div>

        {lists?.length ? (
          <div className="mt-6">
            <div className="flex flex-wrap justify-center gap-6">
              {lists?.map((list) => (
                <div
                  key={list.id}
                  className="break-inside-avoid hover:scale-102 transition-transform w-[400px]"
                >
                  <ListCard
                    list={list}
                    updateList={updateListHandler}
                    handleDelete={deleteListHandler}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* No Lists */
          <div className="mt-12 max-w-lg mx-auto text-center">
            <div className="rounded-lg bg-white/5 p-8 shadow-lg ring-1 ring-gray-900/10 dark:ring-white/10">
              <div className="flex justify-center">
                <svg
                  className="h-24 w-24 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
                No lists yet
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Click the "Create new list" card above to get started! ☝️
              </p>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="text-gray-400 px-4 font-medium">or</span>
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-4">
                <Button
                  onClick={handleSync}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Sync with Cloud ☁️
                </Button>
              </div>
            </div>
          </div>
        )}

        <SyncComponent
          onClick={handleSync}
          isLoading={isPending}
          lastSync={lastSync}
          currentFrequency={syncFrequency}
          onFrequencyChange={handleFrequencyChange}
          isServerAlive={isServerAlive}
        />
      </div>
    </div>
  );
};
