import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { List } from 'src/entities/list.entity';
import { ZmqService } from '@/zmq/zmq.service';
@Injectable()
export class ListsService {
  constructor(
    private prisma: PrismaService,
    private zmqService: ZmqService,
  ) {}

  async listHandler(lists: List[]) {
    // Get the user ID from the first list
    const user = await this.prisma.user.findUnique({
      where: { id: lists[0].ownerId },
    });

    // TODO: Implement
    // Logic: The many front-ends, from time to time, will send a batch of lists to be created/updated.
    // Make sure to handle conflicts between different front-ends.
    // We will handle it using CRDTs.
    // Both lists and items have a createdAt and updatedAt timestamp.
    // We can implement a LWW (Last Writer Wins) strategy to handle conflicts.

    // This function exit point is to publish the lists to the users.
    // We will publish the lists to the users using ZeroMQ.

    // Simulate change and delay
    lists[0].name = 'ZMQ is working';
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await this.zmqService.publishUserLists(user.id, lists);
  }

  async getLists(userId: string) {
    return this.prisma.list.findMany({ where: { ownerId: userId } });
  }

  async getList(id: string) {
    const list = await this.prisma.list.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!list) {
      throw new NotFoundException(`List with ID ${id} not found`);
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: list?.ownerId },
      select: {
        username: true,
      },
    });

    return { ...list, owner };
  }
}
