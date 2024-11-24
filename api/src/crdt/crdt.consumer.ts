// Jobs to handle conflicts between different versions of the same list.
import { List } from '@/entities/list.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { ZmqService } from '@/zmq/zmq.service';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bull';

@Injectable()
@Processor('crdt')
export class CrdtConsumer {
  constructor(
    private readonly zmqService: ZmqService,
    private readonly prisma: PrismaService,
    @InjectQueue('crdt') private readonly crdtQueue: Queue,
  ) {}

  // Job called when:
  // 1. A FE has sent a batch of lists to the server.
  // 2. A user has edited a single list, through the single-list viewer.
  @Process('resolve-conflicts')
  async handleConflicts(job: Job<{ userId: string; lists: List[] }>) {
    this.crdtQueue.empty();
    let userId = job.data.userId;
    const lists = job.data.lists;

    // At this point, if we were not sent lists, then one of two things happened:
    // 1. This was a FE that requested all lists for a user.
    // 2. This was a FE that deleted all lists for a user, and then synced.
    if (lists.length === 0) {
      // TODO: Should this be a separate flow? Or can we handle it
      // just like other changes below?
    } else if (userId !== lists[0].ownerId) {
      // This means that another user Y has edited user's X list
      // The real "owner" of the list is X, and Y is just a viewer.
      userId = lists[0].ownerId;
    }

    // For now, just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // And return the user's lists
    const resolvedLists = await this.prisma.list.findMany({
      where: { ownerId: userId },
      include: { items: true },
    });

    // This should be the exit point of the function.
    // Will publish the resolved lists to all this user's FEs
    await this.zmqService.publishUserLists(userId, resolvedLists);
  }
}
