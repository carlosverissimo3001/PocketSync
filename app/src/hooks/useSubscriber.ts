import { useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/hooks/useToast";
import { useSync } from "@/contexts/SyncContext";
import { List } from "@/types/list.types";
import { useDB } from "@/contexts/DBContext";
import { handleListInsertions } from "@/db/db-utils";

const useSubscriber = (userId: string) => {
  const { toast } = useToast();
  const { updateLastSync } = useSync();
  const socketRef = useRef<Socket>();
  const { db } = useDB();

  const handleListUpdate = useCallback(
    async (receivedLists: List[]) => {
      try {
        if (!db) {
          return;
        }

        handleListInsertions(receivedLists, updateLastSync);
      } catch (err) {
        console.error("Database operation failed:", err);
      }
    },
    [updateLastSync, db]
  );

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
          socket.emit("joinRoom", userId);
        });

        socket.on("listUpdate", handleListUpdate);

        socket.on("disconnect", () => {});

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
      }
    };
  }, [userId, handleListUpdate, toast, db]);

  return null;
};

export default useSubscriber;
