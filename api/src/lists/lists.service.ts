import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { List } from 'src/entities/list.entity';
import { ZmqService } from '@/zmq/zmq.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SyncListsDto } from '@/dtos/sync-lists.dto';

@Injectable()
export class ListsService {
  constructor(
    private prisma: PrismaService,
    private zmqService: ZmqService,
    @InjectQueue('crdt') private bullService: Queue,
  ) {}

  async listHandler(data: SyncListsDto) {
    // Called when:
    // 1. A FE has sent a batch of lists to the server.
    // 1.1 The owner of the lists is the user in the body.
    // 2. A user has edited a single list, through the single-list viewer.
    // 2.1 The owner of the list is not the user in the body.
    // !! BE CAREFUL !!
    const { userId, lists } = data;

    // All this handler will do is enqueue a job to resolve conflicts.
    await this.bullService.add('resolve-conflicts', {
      userId,
      lists,
    });

    // return immediately
    return;
  }

  async getLists(userId: string) {
    return this.prisma.list.findMany({ where: { ownerId: userId } });
  }

  async getList(id: string) {
    const list = await this.prisma.list.findUnique({
      where: { id, deleted: false },
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
