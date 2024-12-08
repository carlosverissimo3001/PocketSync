import { useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/useToast";
import { useSync } from "@/contexts/SyncContext";
import { List } from "@/types/list.types";
import { useDB } from "@/contexts/DBContext";
import { createList } from "@/db/db-utils";
import { SYNC_SUCCESS, TOAST_MESSAGES } from "@/utils/toast-messages";

const useSubscriber = (userId: string) => {
  const { toast } = useToast();
  const { updateLastSync } = useSync();
  const socketRef = useRef<Socket>();
  const { db } = useDB();

  const handleListUpdate = useCallback(async (receivedLists: List[]) => {
    try {
      if (!db) {
        console.log('Database not yet initialized, skipping update');
        return;
      }

      if(receivedLists.length !== 0) {
        await db.transaction('rw', [db.lists, db.items, db.serverSyncs], async () => {
          // TODO: Find a way to make this more efficient
        await db.lists.clear();
        
        for (const list of receivedLists) {
          await createList(list);

          if (list.items?.length) {
            await Promise.all(
              list.items.map(item => db.items.put(item))
            );
          }
        }
        
        await db.serverSyncs.put({
          id: uuidv4(),
          listLength: receivedLists.length,
          lastSync: new Date(),
        });
        });

        updateLastSync(receivedLists.length);
      }
      
      toast(SYNC_SUCCESS(receivedLists.length));
    } catch (err) {
      console.error('Database operation failed:', err);
      toast(TOAST_MESSAGES.SYNC_ERROR);
    }
  }, [toast, updateLastSync, db]);

  useEffect(() => {
    if (!db || !userId) return;

    const startSubscriber = async () => {
      try {
        socketRef.current = io(import.meta.env.VITE_SOCKET_IO_URL, {
          query: { userId },
          auth: { userId },
          transports: ["websocket"],
        });

        const socket = socketRef.current;
        
        socket.on("connect", () => {
          console.log(`Connected to Socket.IO server for user: ${userId}`);
          socket.emit("joinRoom", userId);
        });

        socket.on("listUpdate", handleListUpdate);
        
        socket.on("disconnect", () => {
          console.log("Disconnected from Socket.IO server");
        });

        socket.on("error", (error) => {
          console.error("Socket.IO connection error:", error);
        });
      } catch (err) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to sync server. Retrying...",
          variant: "destructive",
          duration: 4000,
        });
        console.error(err);
      }
    };

    startSubscriber();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        console.log("Subscriber closed");
      }
    };
  }, [userId, handleListUpdate, toast, db]);

  return null;
};

export default useSubscriber;
