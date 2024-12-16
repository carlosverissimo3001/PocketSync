import { SyncListsDto } from '@/dtos/sync-lists.dto';
import { CreateListDto } from '@/dtos/create-list.dto';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { List, PrismaClient, User } from '@prisma/client';
import { JOB_SETTINGS, LIST_CACHE_TTL } from '@/consts/consts';
import { CRDTService } from '@/crdt/crdt.service';
import { ShardRouterService } from '@/sharding/shardRouter.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';

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
   * Creates a new list and buffers its initial state.
   * Ensures that both operations are performed atomically across shards.
   * @param userId - The ID of the user creating the list.
   * @param createListDto - The data for the new list.
   * @returns The created List object.
   */
  async createList(data: CreateListDto): Promise<List> {
    const listId = uuidv4();
    const { userId, name, lastEditorUsername } = data;

    try {
      // Step 1: Create the List on all relevant shards
      await this.shardRouterService.writeWithQuorum(
        userId,
        async (prisma: PrismaClient) => {
          await prisma.list.create({
            data: {
              id: listId,
              name,
              owner: { connect: { id: userId } },
              lastEditorUsername,
              updatedAt: new Date(),
            },
          });

          this.logger.log(
            `Created list '${name}' with ID '${listId}' for user '${userId}' on shard.`,
          );
        },
      );

      // Step 2: Cache the listId to userId mapping for efficient lookups
      await this.cacheManager.set(`list:${listId}`, userId, LIST_CACHE_TTL);

      // Step 3: Buffer the initial change related to the list creation
      await this.crdtService.addToBuffer(userId, [
        {
          id: listId,
          name,
          ownerId: userId,
          createdAt: new Date(),
          items: [], // Initialize with empty items or as per your requirement
          updatedAt: new Date(),
          deleted: false,
          lastEditorUsername,
        },
      ]);

      this.logger.log(
        `Buffered creation of list '${name}' with ID '${listId}' for user '${userId}'.`,
      );

      // Step 4: Enqueue the buffer processing job if not already queued
      if (!(await this.crdtService.isJobAlreadyQueuedForUser(userId))) {
        await this.crdtQueue.add(
          'process-buffer',
          { userId, isEmptySync: false },
          JOB_SETTINGS,
        );

        this.logger.log(`Enqueued 'process-buffer' job for userId: ${userId}`);
      } else {
        this.logger.log(`Job already queued for userId: ${userId}`);
      }

      // Step 5: Retrieve and return the created list
      const createdList = await this.getList(listId);
      return createdList;
    } catch (error) {
      this.logger.error(
        `Error creating list '${name}' for user '${userId}': ${(error as Error).message}`,
      );
      throw new Error('Failed to create list. Please try again.');
    }
  }

  /**
   * Checks if a list with the given ID exists for the user.
   * @param listId - The ID of the list to check.
   * @param userId - The ID of the user owning the list.
   * @returns A boolean indicating whether the list exists.
   */
  private async checkIfListExists(
    listId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Use readWithQuorum to check list existence
      const list = await this.shardRouterService.readWithQuorum<List>(
        userId,
        async (prisma: PrismaClient) => {
          return await prisma.list.findUnique({
            where: { id: listId },
          });
        },
      );
      return !!list;
    } catch (error) {
      this.logger.error(
        `Error checking existence of listId: ${listId} for userId: ${userId}: ${(error as Error).message}`,
      );
      throw new Error('Failed to check list existence.');
    }
  }

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
   * Retrieves a single list by its ID using read quorum.
   * If the ownerId is not found in the cache, it searches all shards as a fallback.
   * @param id - The ID of the list.
   * @returns The list with the given ID, including the owner's username.
   * @throws NotFoundException if the list does not exist.
   */
  async getList(id: string): Promise<List & { owner: Partial<User> }> {
    try {
      let ownerId: string | undefined = await this.cacheManager.get(`list:${id}`);

      // If cache miss, fallback to searching all shards
      if (!ownerId) {
        this.logger.warn(`Cache miss for listId: ${id}. Searching all shards.`);
        const listWithOwner = await this.findListInAllShards(id);
        if (!listWithOwner) {
          throw new NotFoundException(`List with ID ${id} not found.`);
        }
        ownerId = listWithOwner.ownerId;

        // Step 3: Update the cache with the found ownerId
        await this.cacheManager.set(`list:${id}`, ownerId, LIST_CACHE_TTL);
        this.logger.log(`Cache updated for listId: ${id} with ownerId: ${ownerId}`);
      }

      //  Use readWithQuorum to fetch the list from the correct shard
      const list = await this.shardRouterService.readWithQuorum<List & { owner: Partial<User> }>(
        ownerId, // Sharding key based on ownerId
        async (prisma: PrismaClient) => {
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
        // If not found in the expected shard, perform a fallback search
        this.logger.warn(
          `List with ID ${id} not found in the expected shard based on ownerId: ${ownerId}. Initiating fallback search.`,
        );
        const fallbackList = await this.findListInAllShards(id);
        if (!fallbackList) {
          throw new NotFoundException(`List with ID ${id} not found.`);
        }
        return fallbackList;
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

  /**
   * Searches for the list across all shards.
   * @param listId The ID of the list to search for.
   * @returns The list with owner information if found, else undefined.
   */
  private async findListInAllShards(listId: string): Promise<List & { owner: Partial<User> } | undefined> {
    const shardClients = await this.shardRouterService.getAllShardClients();
    for (const prisma of shardClients) {
      try {
        const fetchedList = await prisma.list.findUnique({
          where: { id: listId },
          include: { items: true },
        });

        if (fetchedList) {
          const owner = await prisma.user.findUnique({
            where: { id: fetchedList.ownerId },
            select: { username: true },
          });

          if (!owner) {
            this.logger.warn(
              `Owner with ID '${fetchedList.ownerId}' not found for listId: ${listId} in shard.`,
            );
            return { ...fetchedList, owner: { username: 'Unknown' } };
          }

          this.logger.log(
            `Found listId: ${listId} in shard. Owner: ${owner.username}`,
          );

          return { ...fetchedList, owner };
        }
      } catch (error) {
        this.logger.error(
          `Error searching for listId '${listId}' in a shard: ${(error as Error).message}`,
        );
        // Continue searching other shards
      }
    }
    return undefined;
  }
}
