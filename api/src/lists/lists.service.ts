import { SyncListsDto } from '@/dtos/sync-lists.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { List, User } from '@prisma/client';
import { JOB_SETTINGS } from '@/consts/consts';
import { CRDTService } from '@/crdt/crdt.service';
import { ShardRouterService } from '@/sharding/shardRouter.service';

@Injectable()
export class ListsService {
  constructor(
    private crdtService: CRDTService,
    @InjectQueue('crdt') private crdtQueue: Queue,
    private shardRouterService: ShardRouterService,
  ) {}

  async enqueueListChanges(data: SyncListsDto) {
    const { userId: requesterId, lists } = data;
    const isEmptySync = lists.length === 0;
    const userId = !isEmptySync ? lists[0].ownerId : requesterId;

    if (!isEmptySync) {
      await this.crdtService.addToBuffer(userId, lists);
    }

    if (await this.crdtService.isJobAlreadyQueuedForUser(userId)) {
      return;
    }

    await this.crdtQueue.add(
      'process-buffer',
      { userId, isEmptySync },
      JOB_SETTINGS,
    );
  }

  /**
   * Gets all lists for a given user.
   * @param userId - The ID of the user.
   * @returns All lists for the given user.
   */
  async getLists(userId: string): Promise<List[]> {
    const prisma = await this.shardRouterService.getShardClientForKey(userId);
    return prisma.list.findMany({ where: { ownerId: userId } });
  }

  /**
   * Gets a single list by ID.
   * @param id - The ID of the list.
   * @returns The list with the given ID, plus the owner's username.
   */
  async getList(id: string): Promise<List & { owner: Partial<User> }> {
    const prisma = await this.shardRouterService.getShardClientForKey(id);

    const list = await prisma.list.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!list) {
      throw new NotFoundException(`List with ID ${id} not found`);
    }

    const ownerPrisma = await this.shardRouterService.getShardClientForKey(
      list.ownerId,
    );

    const owner = await ownerPrisma.user.findUnique({
      where: { id: list.ownerId },
      select: {
        username: true,
      },
    });

    return { ...list, owner };
  }
}
