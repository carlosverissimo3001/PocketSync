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
   * Retrieves all lists for a given user using read quorum.
   * @param userId - The ID of the user.
   * @returns All lists for the given user.
   */
  async getLists(userId: string): Promise<List[]> {
    try {
      const lists = await this.shardRouterService.readWithQuorum<List[]>(
        userId, // Directly use userId as sharding key
        async (prisma) => {
          return await prisma.list.findMany({
            where: { ownerId: userId },
            include: { items: true },
          });
        },
      );

      this.logger.log(
        `Retrieved ${lists.length} lists for userId: ${userId} with quorum.`,
      );
      return lists;
    } catch (error) {
      this.logger.error(
        `Error retrieving lists for userId: ${userId}`,
        (error as Error).stack,
      );
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
        this.logger.log(
          `Retrieved shard '${cachedShardName}' for listId: ${listId} from cache.`,
        );
        return prisma;
      }

      // **Removed shard lookup based on listId**

      this.logger.warn(`List with ID ${listId} not found in cache.`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding shard for listId: ${listId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves a single list by its ID using read quorum.
   * @param id - The ID of the list.
   * @returns The list with the given ID, including the owner's username.
   * @throws NotFoundException if the list does not exist.
   */
  async getList(id: string): Promise<List & { owner: Partial<User> }> {
    try {
      // **Assuming the caller knows the userId**, pass it to determine the shard
      // If not, this requires a central index, which you prefer not to use
      // Hence, ensure that the shardKey is userId during list creation

      // For demonstration, let's assume you have the userId
      // Replace 'userId' with the actual userId associated with the list
      const userId = 'b8f7bbb5-affb-48c3-b4cc-e6ac2a7c6a09'; // Example userId

      const list = await this.shardRouterService.readWithQuorum<List & { owner: Partial<User> }>(
        userId, // Use userId as sharding key
        async (prisma) => {
          const fetchedList = await prisma.list.findUnique({
            where: { id },
            include: { items: true },
          });

          if (!fetchedList) return null;

          const owner = await prisma.user.findUnique({
            where: { id: fetchedList.ownerId },
            select: { username: true },
          });

          if (!owner) {
            this.logger.warn(
              `Owner with ID '${fetchedList.ownerId}' not found for listId: ${id}`,
            );
            return { ...fetchedList, owner: { username: 'Unknown' } };
          }

          this.logger.log(
            `Retrieved listId: ${id} with owner: ${owner.username} from shard with quorum.`,
          );
          return { ...fetchedList, owner };
        },
      );

      if (!list) {
        throw new NotFoundException(`List with ID ${id} not found`);
      }

      return list;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving list with ID: ${id}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
