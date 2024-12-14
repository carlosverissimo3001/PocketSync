import { SyncListsDto } from '@/dtos/sync-lists.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { List, PrismaClient, User } from '@prisma/client';
import { JOB_SETTINGS } from '@/consts/consts';
import { CRDTService } from '@/crdt/crdt.service';
import { ShardRouterService } from '@/sharding/shardRouter.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class ListsService {
  constructor(
    private crdtService: CRDTService,
    @InjectQueue('crdt') private crdtQueue: Queue,
    private shardRouterService: ShardRouterService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
    return prisma.list.findMany({
      where: { ownerId: userId },
      include: { items: true },
    });
  }

  async getShardForListId(listId: string): Promise<PrismaClient> {
    // Try to get the shard index from cache first
    const cachedShardIndex: number | undefined = await this.cacheManager.get(
      `list:${listId}`,
    );
    if (cachedShardIndex !== undefined) {
      return this.shardRouterService.findByIndex(cachedShardIndex);
    }

    // If not in cache, search all shards
    const shardClients = await this.shardRouterService.getAllShardClients();
    for (let i = 0; i < shardClients.length; i++) {
      const prisma = shardClients[i];
      const list = await prisma.list.findUnique({ where: { id: listId } });
      if (list) {
        // Cache the shard index for this list ID
        await this.cacheManager.set(`list:${listId}`, i, 60 * 60 * 1000); // Cache for 1 hour
        return prisma;
      }
    }
    return null;
  }

  /**
   * Gets a single list by ID.
   * @param id - The ID of the list.
   * @returns The list with the given ID, plus the owner's username.
   */
  async getList(id: string): Promise<List & { owner: Partial<User> }> {
    // Unfortunate that we have to do this, since we don't shard by list ID, but rather by user ID
    // TODO: Investigate other options
    const prisma = await this.getShardForListId(id);

    if (!prisma) {
      throw new NotFoundException(`List with ID ${id} not found`);
    }

    const list = await prisma.list.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!list) {
      throw new NotFoundException(`List with ID ${id} not found`);
    }

    // Remember, user is in the same shard as the list
    const owner = await prisma.user.findUnique({
      where: { id: list.ownerId },
      select: {
        username: true,
      },
    });

    return { ...list, owner };
  }
}
