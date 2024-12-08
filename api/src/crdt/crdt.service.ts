import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BufferedChange } from '@prisma/client';
import {
  buildChangesToPrisma,
  buildListToPrisma,
  List as ListEntity,
} from '@/entities';

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
  constructor(
    private prisma: PrismaService,
    @InjectQueue('crdt') private crdtQueue: Queue,
  ) {}

  /**
   * Merge changes from the buffer into the main list
   * @param incomingChanges - The incoming changes
   * @param existingListId - The ID of the existing list
   * @param requesterId - The ID of the requester, for tracking purposes
   * @returns The merged list
   */
  async resolveChanges(
    incomingChanges: BufferedChange[],
    existingListId: string,
    requesterId: string,
  ): Promise<ListEntity> {
    // A simple Last-Write-Wins strategy
    const existingList = await this.prisma.list.findUnique({
      where: { id: existingListId },
      include: { items: true },
    });

    // Not yet in DB -> Shouldn't happen
    if (!existingList) {
      throw new Error('List not found');
    }

    // Did any of the changes deleted the list?
    const sortedChanges = incomingChanges
      .map((change) => ({
        changes: JSON.parse(String(change.changes)) as ChangePayload,
      }))
      .sort(
        (a, b) =>
          new Date(b.changes.updatedAt).getTime() -
          new Date(a.changes.updatedAt).getTime(),
      );

    // Is the latest change a deletion?
    if (sortedChanges[0]?.changes.deleted) {
      return await this.prisma.list.update({
        where: { id: existingListId },
        data: {
          deleted: true,
          updatedAt: sortedChanges[0].changes.updatedAt,
          lastEditorId: requesterId,
        },
        include: { items: true },
      });
    }

    // List was not deleted, let's process the items
    const latestItemStates = new Map<
      string,
      {
        item: ChangePayload['items'][0];
        lastUpdatedAt: Date;
      }
    >();

    // We will find the last state of each item
    sortedChanges.forEach((change) => {
      change.changes.items?.forEach((item) => {
        // Starting from the last state (the newest)
        // Get the existing item state
        const existingItem = latestItemStates.get(item.id);

        // If the item is not in the map or the change is newer, update the map
        // 1. Newer changes
        // 2. The item is not in the map (meaning it's a new item)
        if (!existingItem || item.updatedAt > existingItem.item.updatedAt) {
          latestItemStates.set(item.id, {
            item,
            lastUpdatedAt: new Date(item.updatedAt),
          });
        }
      });
    });

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

    return await this.prisma.list.update({
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
    for (const list of lists) {
      // Is this a new list
      const existingList = await this.prisma.list.findUnique({
        where: { id: list.id },
      });

      // If it is, we need to create it in the DB
      if (!existingList) {
        await this.prisma.list.create({
          data: buildListToPrisma(list),
        });
      }

      await this.prisma.bufferedChange.create({
        data: {
          userId,
          listId: list.id,
          changes: JSON.stringify(list),
          timestamp: new Date(),
          resolved: false,
        },
      });
    }
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
}
