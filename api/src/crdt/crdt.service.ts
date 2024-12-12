import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BufferedChange } from '@prisma/client';
import { List as ListEntity } from '@/entities';
import { ShardRouterService } from '@/sharding/shardRouter.service';
import { PrismaClient } from '@prisma/client';

interface ChangePayload {
  id: string;
  name: string;
  deleted: boolean;
  deletedAt: string | null;
  updatedAt: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    checked: boolean;
    deleted: boolean;
    deletedAt: string | null;
    updatedAt: string;
    listId: string;
    lastEditorId: string;
  }>;
}

@Injectable()
export class CRDTService {
  private readonly logger = new Logger(CRDTService.name);

  constructor(
    @InjectQueue('crdt') private crdtQueue: Queue,
    private shardRouterService: ShardRouterService,
  ) {}

  /**
   * Merge changes from the buffer into the main list
   * @param incomingChanges - The incoming changes
   * @param existingListId - The ID of the existing list
   * @param requesterId - The ID of the requester
   * @returns The merged list
   */
  async resolveChanges(
    incomingChanges: BufferedChange[],
    existingListId: string,
    requesterId: string,
  ) {
    if (!incomingChanges || incomingChanges.length === 0) {
      throw new Error('No changes provided for resolution');
    }
    if (!existingListId) {
      throw new Error('Invalid or missing list ID');
    }
    if (!requesterId) {
      throw new Error('Invalid or missing requester ID');
    }

    // Get the shard-specific Prisma client based on existingListId
    const prisma =
      await this.shardRouterService.getShardClientForKey(existingListId);

    const existingList = await prisma.list.findUnique({
      where: { id: existingListId },
      include: { items: true },
    });

    if (!existingList) {
      throw new Error(`List with ID ${existingListId} not found`);
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
      return await prisma.list.update({
        where: { id: existingListId },
        data: {
          deleted: true,
          updatedAt: sortedChanges[0].changes.updatedAt,
          lastEditorId: requesterId,
        },
        include: { items: true },
      });
    }

    // Update list metadata
    await prisma.list.update({
      where: { id: existingListId },
      data: {
        name: sortedChanges[0].changes.name,
        updatedAt: sortedChanges[0].changes.updatedAt,
        lastEditorId: requesterId,
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
        lastEditorId: requesterId,
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
   * Buffer changes in the database
   * @param userId - The ID of the user
   * @param lists - The lists to be buffered
   */
  async addToBuffer(userId: string, lists: ListEntity[]) {
    if (!userId || !lists || lists.length === 0) {
      throw new Error('Invalid input for buffering');
    }

    // Shard by userId for buffered changes operations
    const prisma = await this.shardRouterService.getShardClientForKey(userId);

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

        if (list.lastEditorId) {
          data.lastEditor = {
            connect: { id: list.lastEditorId },
          };
        }

        await prisma.list.create({ data });
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
  }

  /**
   * Checks if there is already a job queued for the user
   * @param userId - The ID of the user
   * @returns Whether there is a job queued for the user
   */
  async isJobAlreadyQueuedForUser(userId: string): Promise<boolean> {
    const jobs = await this.crdtQueue.getJobs(['waiting', 'active', 'delayed']);
    return jobs.some((job) => job.data.userId === userId);
  }

  async cleanupResolvedBufferChanges() {
    // Cleanup presumably can be done from any shard or a known default shard.
    // If needed, you can loop over shards or pick a shardKey.
    // Here, we assume cleanup is done by userId or a specific key.
    // If multiple shards, you may need a different approach:
    // For simplicity, let's say we pick a shardKey (e.g. 'cleanup-key')
    // to choose a shard. Or you could loop all shards.

    const prisma =
      await this.shardRouterService.getShardClientForKey('cleanup-key');

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const result = await prisma.bufferedChange.deleteMany({
      where: {
        AND: [{ resolved: true }, { timestamp: { lt: oneHourAgo } }],
      },
    });

    return { count: result.count };
  }
}
