import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import zmq from 'zeromq';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

async function runBridgeServer() {
  //Bridge between ZMQ and Socket.IO
  const subscriber = new zmq.Subscriber();
  await subscriber.connect('tcp://127.0.0.1:3002');
  console.log('Connected to ZMQ publisher on port 3002');

  const activeSubscriptions = new Set();

  // Handle Socket.IO connections
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    
    if (!userId) {
      console.log('Connection rejected - no userId provided');
      socket.disconnect();
      return;
    }
    
    console.log('Client connected, userId:', userId);
    socket.join(userId);

    // Subscribe to ZMQ messages for this user if not already subscribed
    if (!activeSubscriptions.has(userId)) {
      subscriber.subscribe(userId);
      activeSubscriptions.add(userId);
      console.log(`Subscribed to ZMQ messages for user: ${userId}`);
    }

    // Handle explicit room joining
    socket.on('joinRoom', (room) => {
      if (room === userId) {
        socket.join(room);
        console.log(`User ${userId} joined room ${room}`);
      }
    });
    socket.on('disconnect', () => {
      console.log('Client disconnected, userId:', userId);
      socket.leave(userId);
      
      // Check if there are any other sockets in this user's room
      const room = io.sockets.adapter.rooms.get(userId);
      if (!room || room.size === 0) {
        // If no more connections for this user, unsubscribe from ZMQ
        subscriber.unsubscribe(userId);
        activeSubscriptions.delete(userId);
        console.log(`Unsubscribed from ZMQ messages for user: ${userId}`);
      }
    });
  });

  // Forward ZMQ messages to Socket.IO clients
  for await (const [msg] of subscriber) {
    try {
      const message = msg.toString();
      const [userId, ...rest] = message.split(' ');
      const lists = JSON.parse(rest.join(' '));
      
      // Emit to specific user's room
      io.to(userId).emit('listUpdate', lists);
      console.log(`Forwarded lists to user: ${userId}`);
    } catch (error) {
      console.error('Error processing ZMQ message:', error);
    }
  }
}

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`Bridge server running on port ${PORT}`);
});

runBridgeServer().catch(console.error);