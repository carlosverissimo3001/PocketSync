import { useAuthContext } from "@/contexts/AuthContext";
import { List } from "@/types/list.types";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useState, useRef } from "react";
import { NewListCard } from "@/components/list/NewListCard";
import {
  fetchListsWithItems,
  createList as createListInDB,
  updateList,
  deleteList,
  handleListInsertions,
} from "@/db/db-utils";
import { ListCard } from "@/components/list/ListCard";
import { SyncComponent } from "@/components/misc/SyncComponent";
import { useCreateList, useFetchLists, useSyncLists } from "@/hooks/useList";
import { useToast } from "@/hooks/useToast";
import useSubscriber from "@/hooks/useSubscriber";
import { useSync } from "@/contexts/SyncContext";
import { useDB } from "@/contexts/DBContext";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/misc/LoadingOverlay";
import { SYNC_SUCCESS, TOAST_MESSAGES } from "@/utils/toast-messages";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export const DashboardPage = () => {
  const [isServerAlive, setIsServerAlive] = useState<boolean>(true);
  const [isDirty, setIsDirty] = useState(false);
  // Wishful thinking, but we'll assume the server is always alive :fingers-crossed:
  const isServerAliveRef = useRef<boolean>(true);
  const { user } = useAuthContext();
  const { initializeUserDB } = useDB();
  const [lists, setLists] = useState<List[]>([]);
  const { mutate: syncLists } = useSyncLists();
  const { mutate: createList } = useCreateList();
  const { toast } = useToast();
  const { lastSync, fetchLastSync, syncFrequency, setSyncFrequency, updateLastSync } = useSync();
  const { mutate: fetchLists, isPending } = useFetchLists(user?.id ?? '');

  const fetchFromServer = () => {
    if (user?.id) {
      fetchLists(undefined, {
        onSuccess: (serverLists) => {
          handleListInsertions(serverLists, updateLastSync);
          toast(SYNC_SUCCESS(serverLists.filter(list => !list.deleted).length));
        }
      });
    }
  };

  const handleSync = async () => {    
    syncLists(
      { lists, userId: user?.id ?? '' },
      {
        onSuccess: () => {
          toast(TOAST_MESSAGES.SYNC_SENT);
          if (!isServerAlive) {
            setIsServerAlive(true);
          }
        },
        onError: () => {
          toast(TOAST_MESSAGES.SYNC_FAILED);
          if (isServerAlive) {
            setIsServerAlive(false);
          }
        }
      }
    );
  };

  // Initialize DB when user is available
  useEffect(() => {
    const init = async () => {
      if (user?.id) {
        await initializeUserDB(user.id);
      }
    };
    init();
  }, [user?.id, initializeUserDB]);

  // Hook to fetch last sync time
  useEffect(() => {
    if (user?.id) {
      fetchLastSync();
    }
  }, [user?.id, fetchLastSync]);

  // Start the subscriber to receive updates from the server
  useSubscriber(user?.id ?? '');

  // Hook to fetch lists from local storage
  // Refetch lists when last sync time changes
  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchListsWithItems();
      setLists(data);
    }
    fetchData();
  }, [lastSync]);

  // Trigger sync when lists changes
  useEffect(() => {
    if (user?.id && lists.length > 0 && isDirty) {
      syncLists({ lists, userId: user.id });
    }
    setIsDirty(false);
  }, [lists, user?.id, syncLists, isDirty]);
  

  // Hook to sync lists with server based on frequency
  // Is updated when frequency or lists change
  useEffect(() => {
    if (syncFrequency === 0) {
      return;
    }

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
        if(!isServerAliveRef.current) {
          toast({
            title: "Server is back online 🟢",
            description: "Your data will be sent to the cloud soon!",
            duration: 3000,
          });
          isServerAliveRef.current = response.ok;
          setIsServerAlive(response.ok);

          // Set an immediate sync
          const fetchLatestLists = async () => {
            const latestLists = await fetchListsWithItems();
            syncLists({ lists: latestLists, userId: user?.id ?? '' });
          };
          
          fetchLatestLists();
        }
      } catch (error) {
        if(isServerAliveRef.current) {
          toast({
            title: "Server is not responding 🚨🚨",
            description: "But don't worry, your data is still safe locally!",
            variant: "destructive",
            duration: 3000,
          });
          isServerAliveRef.current = false;
          setIsServerAlive(false);
        }
        console.error(error);
      }
    };

    // Initial check
    checkServerHealth();

    // Set up interval
    const interval = setInterval(checkServerHealth, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [toast]);

  const createListHandler = async (listName: string) => {
    const newList: List = {
      id: uuidv4(),
      name: listName,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: user?.id ?? "",
      deleted: false,
      items: [],
      lastEditorUsername: user?.username ?? "",
    };
  
    // Create list in local DB
    await createListInDB(newList);
    const updatedLists = await fetchListsWithItems();
    setLists(updatedLists);


    createList({
      userId: user?.id ?? '',
      name: newList.name,
      lastEditorUsername: user?.username ?? '',
    },
    {
      onSuccess: () => {
        toast({
          title: `List "${newList.name}" created in cloud successfully!`,
          description: "Start adding items to your list",
          duration: 3000,
        });
      },
      onError: () => {
        toast({
          title: "Offline mode",
          description: "List saved locally, will sync when connection is restored",
          variant: "warning",
          duration: 3000,
        });
      }
    }
    );
  };

  const updateListHandler = async (list: List) => {
    await updateList(list);

    const updatedLists = await fetchListsWithItems();
    setLists(updatedLists);
    setIsDirty(true);
  };

  const deleteListHandler = async (list: List) => {
    // Mark as deleted
    await deleteList(list.id);

    // Refetch lists
    const updatedLists = await fetchListsWithItems();
    setLists(updatedLists);
    setIsDirty(true);
  };

  const handleFrequencyChange = (minutes: number) => {
    setSyncFrequency(minutes);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
            Welcome,{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              {user?.username}
            </span>
          </h1>
        </div>

        <div className="break-inside-avoid mb-6 hover:scale-102 transition-transform flex justify-center">
          <NewListCard onAdd={createListHandler} />
        </div>

        {isPending ? (
          <div className="mt-12 max-w-lg mx-auto text-center">
            <LoadingOverlay />
          </div>
        ) : lists.filter(list => !list.deleted).length ? (
          <div className="mt-6">
            <div className="flex flex-wrap justify-center gap-6">
              {lists?.filter(list => !list.deleted).map((list) => (
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
                You don't have any lists locally 📄
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        onClick={fetchFromServer}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        disabled={isPending || !isServerAlive}
                      >
                        Fetch from Cloud ☁️
                      </Button>
                    </TooltipTrigger>
                    {!isServerAlive && (
                      <TooltipContent>
                        Apologies, the server is down right now. Your data is still safe locally.
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}


        <SyncComponent
          lastSync={lastSync}
          currentFrequency={syncFrequency}
          onFrequencyChange={handleFrequencyChange}
          isServerAlive={isServerAlive}
          isLoading={isPending}
          onClick={handleSync}
        />
      </div>
    </div>
  );
};
