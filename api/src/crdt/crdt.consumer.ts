// Jobs to handle conflicts between different versions of the same list.
import { buildSampleList, List } from '@/entities/list.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { ZmqService } from '@/zmq/zmq.service';
import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';

@Injectable()
@Processor('crdt')
export class CrdtConsumer {
  constructor(
    private readonly zmqService: ZmqService,
    private readonly prisma: PrismaService,
  ) {}

  // Job called when:
  // 1. A FE has sent a batch of lists to the server.
  // 2. A user has edited a single list, through the single-list viewer.
  @Process('resolve-conflicts')
  async handleConflicts(job: Job<{ userId: string; lists: List[] }>) {
    const { userId, lists } = job.data;

    // At this point, if we were not sent lists, then one of two things happened:
    // 1. This was a FE that requested all lists for a user.
    // 2. This was a FE that deleted all lists for a user, and then synced.

    // TODO: Handle the second one gracefully.
    if (lists.length === 0) {
      let lists = await this.prisma.list.findMany({
        where: { ownerId: userId },
        include: { items: true },
      });

      if (lists.length === 0) {
        // This user has no lists, what a shame :/
        // let's create them a default one.
        await this.prisma.list.create({
          data: buildSampleList(userId),
        });
      }

      // Refresh the lists
      lists = await this.prisma.list.findMany({
        where: { ownerId: userId },
        include: { items: true },
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      return this.zmqService.publishUserLists(userId, lists);
    }

    // TODO: Implement conflict resolution.
    // After returning, will publish the lists to the user using ZeroMQ.

    // For now, just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // And publish the lists to the user
    // with a small change so we know it's from the CRDT
    lists[0].name = 'Hello from CRDT';
    await this.zmqService.publishUserLists(userId, lists);
  }
}
