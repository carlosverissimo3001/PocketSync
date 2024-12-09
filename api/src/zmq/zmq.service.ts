import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import * as zmq from 'zeromq';
import { List } from '@/entities';

@Injectable()
export class ZmqService implements OnModuleInit, OnApplicationShutdown {
  private pubSocket: zmq.Publisher;
  private isStarted = false;

  constructor() {
    this.pubSocket = new zmq.Publisher();
  }

  async onModuleInit() {
    if (this.isStarted) {
      return;
    }
    console.log('ZeroMQ Publisher bound to port 3002');
    await this.pubSocket.bind('tcp://127.0.0.1:3002'); // Bind to port
    this.isStarted = true;
  }

  async onApplicationShutdown() {
    await this.pubSocket.close();
    console.log('ZeroMQ Publisher closed');
  }

  /**
   * After conflicts are resolved, we need to publish the lists to the users.
   * @param userId The user ID
   * @param lists The lists to publish
   */
  async publishUserLists(userId: string, lists: List[]) {
    // Topic-based messaging: We will prefix the message with the user ID
    // Then, the subscriber can simply do <subSocket.subscribe(userId)>
    // and receive all messages related to them
    const message = `${userId} ${JSON.stringify(lists)}`;
    console.log('Publishing lists to user:', userId);
    await this.pubSocket.send(message);
  }
}
