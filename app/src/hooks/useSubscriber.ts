import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import db from "@/db/db";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/useToast";

const useSubscriber = (userId: string) => {
  const { toast } = useToast();

  useEffect(() => {
    let socket: Socket;

    const startSubscriber = async () => {
      try {
        socket = io(import.meta.env.VITE_SOCKET_IO_URL, {
          query: { userId },
          auth: { userId }, // double layer of security
          transports: ["websocket"],
        });

        // Connection events
        socket.on("connect", () => {
          console.log(`Connected to Socket.IO server for user: ${userId}`);

          socket.emit("joinRoom", userId);
        });

        // Listen for list updates
        socket.on("listUpdate", async (receivedLists) => {
          console.log("Received updated lists:", receivedLists);

          await db.lists.bulkPut(receivedLists);
          await db.serverSyncs.put({
            id: uuidv4(),
            listLength: receivedLists.length,
            lastSync: new Date(),
          });
          console.log("Lists stored in local storage");
          
          toast({
            title: "✨ Lists Updated",
            description: `${receivedLists.length} ${receivedLists.length === 1 ? 'list' : 'lists'} synchronized from the cloud ☁️`,
            duration: 3000,
            variant: "default",
            className: "bg-green-500 text-white dark:bg-green-600 dark:text-white",
          });
        });

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
      }
    };

    startSubscriber();

    return () => {
      socket.close(); // Clean up the subscription when the component is unmounted
      console.log("Subscriber closed");
    };
  }, [userId]);

  return null; // No need to return anything from this hook
};

export default useSubscriber;
