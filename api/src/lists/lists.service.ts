// src/lists/lists.service.ts

import { SyncListsDto } from '@/dtos/sync-lists.dto';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(ListsService.name);

  constructor(
    private crdtService: CRDTService,
    @InjectQueue('crdt') private crdtQueue: Queue,
    private shardRouterService: ShardRouterService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Enqueues list changes for processing.
   * @param data - The synchronization data containing userId and lists.
   */
  async enqueueListChanges(data: SyncListsDto) {
    const { userId: requesterId, lists } = data;
    const isEmptySync = lists.length === 0;
    const userId = !isEmptySync ? lists[0].ownerId : requesterId;

    if (!isEmptySync) {
      await this.crdtService.addToBuffer(userId, lists);
    }

    if (await this.crdtService.isJobAlreadyQueuedForUser(userId)) {
      this.logger.log(`Job already queued for userId: ${userId}`);
      return;
    }

    await this.crdtQueue.add(
      'process-buffer',
      { userId, isEmptySync },
      JOB_SETTINGS,
    );

    this.logger.log(`Enqueued 'process-buffer' job for userId: ${userId}`);
  }

  /**
   * Retrieves all lists for a given user.
   * @param userId - The ID of the user.
   * @returns All lists for the given user.
   */
  async getLists(userId: string): Promise<List[]> {
    try {
      // Determine the shard for the user and retrieve the PrismaClient
      const shard = this.shardRouterService.getShardForUser(userId);
      const prisma: PrismaClient = this.shardRouterService.getPrismaClient(shard.name);

      const lists = await prisma.list.findMany({
        where: { ownerId: userId },
        include: { items: true },
      });

      this.logger.log(`Retrieved ${lists.length} lists for userId: ${userId} from shard: ${shard.name}`);
      return lists;
    } catch (error) {
      this.logger.error(`Error retrieving lists for userId: ${userId}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Finds the PrismaClient responsible for a given listId.
   * @param listId - The ID of the list.
   * @returns The PrismaClient of the shard containing the list or null if not found.
   */
  async getShardForListId(listId: string): Promise<PrismaClient | null> {
    try {
      // Try to get the shard name from cache first
      const cachedShardName: string | undefined = await this.cacheManager.get(
        `list:${listId}`,
      );
      if (cachedShardName) {
        const prisma = this.shardRouterService.getPrismaClient(cachedShardName);
        this.logger.log(`Retrieved shard '${cachedShardName}' for listId: ${listId} from cache.`);
        return prisma;
      }

      // If not in cache, search all shards
      const shardClients = await this.shardRouterService.getAllShardClients();
      for (const [shardName, prisma] of Object.entries(shardClients)) {
        const list = await prisma.list.findUnique({ where: { id: listId } });
        if (list) {
          // Cache the shard name for this list ID
          await this.cacheManager.set(`list:${listId}`, shardName, 60 * 60 * 1000); // Cache for 1 hour
          this.logger.log(`Found listId: ${listId} in shard: ${shardName} and cached it.`);
          return prisma;
        }
      }

      this.logger.warn(`List with ID ${listId} not found in any shard.`);
      return null;
    } catch (error) {
      this.logger.error(`Error finding shard for listId: ${listId}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Retrieves a single list by its ID.
   * @param id - The ID of the list.
   * @returns The list with the given ID, including the owner's username.
   * @throws NotFoundException if the list does not exist.
   */
  async getList(id: string): Promise<List & { owner: Partial<User> }> {
    try {
      const prisma = await this.getShardForListId(id);
      if (!prisma) {
        throw new NotFoundException(`List with ID ${id} not found`);
      }

      const list = await prisma.list.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!list) {
        throw new NotFoundException(`List with ID ${id} not found`);
      }

      // Since lists are sharded by user, fetch the owner from the same shard
      const owner = await prisma.user.findUnique({
        where: { id: list.ownerId },
        select: { username: true },
      });

      if (!owner) {
        this.logger.warn(`Owner with ID ${list.ownerId} not found for listId: ${id}`);
        return { ...list, owner: { username: 'Unknown' } };
      }

      this.logger.log(`Retrieved listId: ${id} with owner: ${owner.username} from shard.`);
      return { ...list, owner };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error retrieving list with ID: ${id}`, (error as Error).stack);
      throw error;
    }
  }

}
