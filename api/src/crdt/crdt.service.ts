/**
 * CRDTService
 *
 * This service provides functionality for managing and resolving changes in a
 * Conflict-free Replicated Data Type (CRDT) system. It handles the merging of
 * changes from a buffer into the main list, buffering new changes, checking if
 * jobs are already queued for a user, and cleaning up resolved changes from the buffer.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BufferedChange } from '@prisma/client';
import { List as ListEntity } from '@/entities';
import { ShardRouterService } from '@/sharding/shardRouter.service';
import { UsersService } from '@/users/users.service';
import { PrismaClient } from '@prisma/client';

/**
 * Interface for the payload of a change.
 */
interface ChangePayload {
  id: string;
  name: string;
  deleted: boolean;
  updatedAt: string;
  lastEditorUsername: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    checked: boolean;
    deleted: boolean;
    updatedAt: string;
    listId: string;
    lastEditorUsername: string;
  }>;
}

@Injectable()
export class CRDTService {
  private readonly logger = new Logger(CRDTService.name);

  constructor(
    @InjectQueue('crdt') private crdtQueue: Queue,
    private shardRouterService: ShardRouterService,
    private usersService: UsersService,
  ) {}

  /**
   * Resolves changes from the buffer and merges them into the main list.
   * @param incomingChanges - Array of buffered changes to be resolved.
   * @param existingListId - ID of the list to merge the changes into.
   * @param userId - ID of the user who we're handling the changes for.
   * @returns The updated list after merging the changes.
   * @throws Error if inputs are invalid or the list does not exist.
   */
  async resolveChanges(
    incomingChanges: BufferedChange[],
    existingListId: string,
    userId: string,
  ) {
    if (!incomingChanges || incomingChanges.length === 0) {
      throw new Error('No changes provided for resolution');
    }
    if (!existingListId) {
      throw new Error('Invalid or missing list ID');
    }
    if (!userId) {
      throw new Error('Invalid or missing user ID');
    }

    // Determine the shard for the user
    const shard = this.shardRouterService.getShardForUser(userId);
    const prisma: PrismaClient = this.shardRouterService.getPrismaClient(shard.name);

    const existingList = await prisma.list.findUnique({
      where: { id: existingListId },
      include: { items: true, owner: true },
    });

    if (!existingList) {
      throw new Error(`List with ID ${existingListId} not found in shard ${shard.name}`);
    }

    const sortedChanges = incomingChanges
      .map((change) => ({
        changes: JSON.parse(String(change.changes)) as ChangePayload,
      }))
      .sort(
        (a, b) =>
          new Date(b.changes.updatedAt).getTime() -
          new Date(a.changes.updatedAt).getTime(),
      );

    // If the latest change deletes the list
    if (sortedChanges[0]?.changes.deleted) {
      return await prisma.list.upsert({
        where: { id: existingListId },
        create: {
          id: existingListId,
          name: sortedChanges[0].changes.name,
          deleted: true,
          updatedAt: sortedChanges[0].changes.updatedAt,
          lastEditorUsername: sortedChanges[0].changes.lastEditorUsername,
          ownerId: userId,
        },
        update: {
          deleted: true,
          updatedAt: sortedChanges[0].changes.updatedAt,
          lastEditorUsername: sortedChanges[0].changes.lastEditorUsername,
        },
        include: { items: true },
      });
    }

    // Update/Create list metadata
    await prisma.list.upsert({
      where: { id: existingListId },
      create: {
        id: existingListId,
        name: sortedChanges[0].changes.name,
        updatedAt: sortedChanges[0].changes.updatedAt,
        owner: { connect: { id: userId } },
        lastEditorUsername: sortedChanges[0].changes.lastEditorUsername,
      },
      update: {
        name: await this.getLatestNameChange(sortedChanges, existingList),
        updatedAt: sortedChanges[0].changes.updatedAt,
        lastEditorUsername: sortedChanges[0].changes.lastEditorUsername,
      },
    });

    // Process item changes
    const latestItemStates = new Map<
      string,
      {
        item: ChangePayload['items'][0];
        lastUpdatedAt: Date;
      }
    >();

    sortedChanges.forEach((change) => {
      change.changes.items?.forEach((item) => {
        const existingItem = latestItemStates.get(item.id);
        if (!existingItem || item.updatedAt > existingItem.item.updatedAt) {
          latestItemStates.set(item.id, {
            item,
            lastUpdatedAt: new Date(item.updatedAt),
          });
        }
      });
    });

    // Build the items to be upserted
    const mergedItems = Array.from(latestItemStates.values()).map(
      ({ item }) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        checked: item.checked,
        deleted: item.deleted,
        updatedAt: item.updatedAt,
        lastEditorUsername: item.lastEditorUsername,
      }),
    );

    // DB Update
    await prisma.list.update({
      where: { id: existingListId },
      data: {
        items: {
          upsert: mergedItems.map((item) => ({
            where: { id: item.id },
            create: item,
            update: item,
          })),
        },
      },
      include: { items: true },
    });
  }

  /**
   * Buffers changes in the database.
   * @param userId - ID of the user whose changes are being buffered.
   * @param lists - Array of lists to buffer.
   * @throws Error if inputs are invalid.
   */
  async addToBuffer(userId: string, lists: ListEntity[]) {
    if (!userId || !lists || lists.length === 0) {
      throw new Error('Invalid input for buffering');
    }

    // Determine the shard for the user
    const shard = this.shardRouterService.getShardForUser(userId);
    const prisma: PrismaClient = this.shardRouterService.getPrismaClient(shard.name);

    for (const list of lists) {
      const existingList = await prisma.list.findUnique({
        where: { id: list.id },
      });

      if (!existingList) {
        const data: any = {
          id: list.id,
          name: list.name,
          owner: { connect: { id: list.ownerId } },
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
          deleted: list.deleted,
          lastEditorUsername: list.lastEditorUsername,
          items: {
            create: list.items.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              checked: item.checked,
              updatedAt: item.updatedAt,
              deleted: item.deleted,
            })),
          },
        };

        await prisma.list.create({ data });
        this.logger.log(`List '${list.name}' created in shard '${shard.name}'`);
      }
    }

    const changes = lists.map((list) => ({
      userId,
      listId: list.id,
      changes: JSON.stringify(list),
      timestamp: new Date(),
      resolved: false,
    }));

    await prisma.bufferedChange.createMany({ data: changes });
    this.logger.log(`Buffered ${changes.length} changes for user '${userId}' in shard '${shard.name}'`);
  }

  /**
   * Checks if there is already a queued job for a specific user.
   * @param userId - ID of the user to check.
   * @returns A boolean indicating whether a job is already queued.
   */
  async isJobAlreadyQueuedForUser(userId: string): Promise<boolean> {
    const jobs = await this.crdtQueue.getJobs(['waiting', 'active', 'delayed']);
    return jobs.some((job) => job.data.userId === userId);
  }

  /**
   * Cleans up resolved changes from the buffer that are older than one hour.
   * @returns The number of resolved buffer changes that were cleaned up.
   */
  async cleanupResolvedBufferChanges(): Promise<{ count: number }> {
    const shardClients = await this.shardRouterService.getAllShardClients();
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    let totalCount = 0;

    for (const prisma of shardClients) {
      const result = await prisma.bufferedChange.deleteMany({
        where: {
          AND: [
            { resolved: true },
            { timestamp: { lt: oneHourAgo } }
          ],
        },
      });

      totalCount += result.count;
      this.logger.log(`Cleaned up ${result.count} resolved changes in shard '${prisma}'`);
    }

    return { count: totalCount };
  }

  /**
   * Gets the latest name change from the buffered changes.
   * @param changes - Array of changes.
   * @param list - The original list to get the latest name change for.
   * @returns The latest name change.
   */
  async getLatestNameChange(
    changes: { changes: ChangePayload }[],
    list: ListEntity,
  ): Promise<string> {
    // If the list is not yet found, i.e, new list, then its just the last change
    if (!list) {
      return changes[0].changes.name;
    }

    const { name: listName } = list;

    // Do we have any change for which the name has changed?
    const nameChange = changes.filter((change) => {
      return change.changes.name !== listName;
    });

    // Wasn't modified
    if (nameChange.length === 0) {
      return list.name;
    }

    // Find the latest name change
    const latestNameChange = nameChange.sort((a, b) => {
      return (
        // Need to do this, because it's not a Date object rather a string
        new Date(b.changes.updatedAt).getTime() -
        new Date(a.changes.updatedAt).getTime()
      );
    })[0];

    return latestNameChange.changes.name;
  }
}
