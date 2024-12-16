// src/lists/lists.service.ts

import { SyncListsDto } from '@/dtos/sync-lists.dto';
import { CreateListDto } from '@/dtos/create-list.dto'; // Newly created DTO
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
import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs

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
  async createList(userId: string, createListDto: CreateListDto): Promise<List> {
    const listId = uuidv4(); // Generate a unique list ID
    const { name, lastEditorUsername } = createListDto;

    try {
      // Step 1: Create the List on all relevant shards
      await this.shardRouterService.writeWithQuorum(userId, async (prisma: PrismaClient) => {
        await prisma.list.create({
          data: {
            id: listId,
            name,
            owner: { connect: { id: userId } },
            lastEditorUsername,
            updatedAt: new Date(),
          },
        });

        this.logger.log(`Created list '${name}' with ID '${listId}' for user '${userId}' on shard.`);
      });

      // Step 2: Cache the listId to userId mapping for efficient lookups
      await this.cacheManager.set(`list:${listId}`, userId, 3600); // 1 hour TTL

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

      this.logger.log(`Buffered creation of list '${name}' with ID '${listId}' for user '${userId}'.`);

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
      const createdList = await this.getList(listId, userId);
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
private async checkIfListExists(listId: string, userId: string): Promise<boolean> {
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
    this.logger.error(`Error checking existence of listId: ${listId} for userId: ${userId}: ${(error as Error).message}`);
    throw new Error('Failed to check list existence.');
  }
}

/**
 * Enqueues list changes for processing (for updates and creations).
 * @param data - The synchronization data containing userId and lists.
 * @returns - Nothing.
 */
async enqueueListChanges(data: SyncListsDto) {
  const { userId: requesterId, lists } = data;
  const isEmptySync = lists.length === 0;
  const userId = !isEmptySync ? lists[0].ownerId : requesterId;

  if (!isEmptySync) {
    // Iterate through each list to check existence and create if necessary
    for (const list of lists) {
      const exists = await this.checkIfListExists(list.id, userId);
      if (!exists) {
        await this.createList(userId, list);
        this.logger.log(`List '${list.name}' with ID '${list.id}' created for user '${userId}'.`);
      }
    }

    // Buffer the changes related to existing or newly created lists
    try {
      await this.crdtService.addToBuffer(userId, lists);
      this.logger.log(`Buffered ${lists.length} changes for user '${userId}'.`);
    } catch (error) {
      this.logger.error(
        `Error buffering changes for userId: ${userId}: ${(error as Error).message}`,
      );
      throw new Error('Failed to buffer list changes. Please try again.');
    }
  }

  // Enqueue the buffer processing job if not already queued
  if (await this.crdtService.isJobAlreadyQueuedForUser(userId)) {
    this.logger.log(`Job already queued for userId: ${userId}`);
    return;
  }

  try {
    await this.crdtQueue.add(
      'process-buffer',
      { userId, isEmptySync },
      JOB_SETTINGS,
    );

    this.logger.log(`Enqueued 'process-buffer' job for userId: ${userId}`);
  } catch (error) {
    this.logger.error(
      `Error enqueuing buffer job for userId: ${userId}: ${(error as Error).message}`,
    );
    throw new Error('Failed to enqueue buffer job. Please try again.');
  }
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
   * @param id - The ID of the list.
   * @param userId - The ID of the user owning the list.
   * @returns The list with the given ID, including the owner's username.
   * @throws NotFoundException if the list does not exist.
   */
  async getList(id: string, userId: string): Promise<List & { owner: Partial<User> }> {
    try {
      // Retrieve the shard key based on listId from cache
      const cachedUserId: string | undefined = await this.cacheManager.get(`list:${id}`);
      if (!cachedUserId) {
        throw new NotFoundException(`List with ID ${id} not found.`);
      }

      // Use readWithQuorum to fetch the list from the correct shards
      const list = await this.shardRouterService.readWithQuorum<List & { owner: Partial<User> }>(
        cachedUserId, // Sharding key based on userId
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
        throw new NotFoundException(`List with ID ${id} not found.`);
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
