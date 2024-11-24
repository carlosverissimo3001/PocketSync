import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { useSync } from "@/contexts/SyncContext";
import { formatDistanceToNow } from "date-fns";
import { useSyncLists } from "@/hooks/useList";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { List } from "@/types/list.types";
import { useAuthContext } from "@/contexts/AuthContext";
import { fetchListsWithItems } from "@/db/db-utils";
import { useAuth } from "@/hooks/useAuth";


export const LogoutDialog = () => {
  const { logout } = useAuth()
  const { user } = useAuthContext();
  const { lastSync } = useSync();
  const { mutate: syncLists, isPending: isSyncing } = useSyncLists();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();
  const [lists, setLists] = useState<List[]>([]);

  useEffect(() => {
    const getLists = async () => {
      const fetchedLists = await fetchListsWithItems();
      setLists(fetchedLists);
    };
    getLists();
  }, []);

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
          },
          onError: () => {
            toast({
              title: "Sync failed 🚨",
              description: "Looks like the clouds are not reachable right now 🌧️",
              variant: "destructive",
              duration: 3000,
            });
          }
        }
      );
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoggingOut(false);
      console.error(error);
    }
  };

  const getLastSyncMessage = () => {
    if (isSyncing) {
      return "Sending your lists to the clouds 🌤️";
    }
    if (!lastSync) {
      return "You haven't synced your lists with the server yet.";
    }
    return `Last synced ${formatDistanceToNow(new Date(lastSync), { addSuffix: true })}`;
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          className="text-white hover:bg-gray-700"
          disabled={isSyncing}
        >
          <LogOut />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>This will erase your local lists 🚨</p>
            <p className={`font-medium ${isSyncing ? 'text-blue-500' : ''}`}>
              {getLastSyncMessage()}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isSyncing || isLoggingOut}>
            Cancel
          </AlertDialogCancel>
          <Button 
            variant="secondary"
            onClick={handleSync}
            disabled={isSyncing || isLoggingOut}
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync First'
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isSyncing || isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              'Logout'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 