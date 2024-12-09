import { PrismaService } from '@/prisma/prisma.service';
import { SyncListsDto } from '@/dtos/sync-lists.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { List, User } from '@prisma/client';
import { JOB_SETTINGS } from '@/consts/consts';
import { CRDTService } from '@/crdt/crdt.service';

@Injectable()
export class ListsService {
  constructor(
    private prisma: PrismaService,
    private crdtService: CRDTService,
    @InjectQueue('crdt') private crdtQueue: Queue,
  ) {}

  async enqueueListChanges(data: SyncListsDto) {
    // !!BE CAREFUL!! The user ID in the body might not be the owner of the lists, we check that below.
    const { userId: requesterId, lists } = data;
    const isEmptySync = lists.length === 0;

    // 2 scenarios:
    // No lists are sent: it means user has no lists and requested to be sent the lists stored on the server.
    // Lists are sent: we can check the owner of the lists and use that as the user ID.
    const userId = !isEmptySync ? lists[0].ownerId : requesterId;

    // Buffer the changes, if there are any
    if (!isEmptySync) {
      await this.crdtService.addToBuffer(userId, lists);
    }

    // If there is already a job queued for the user, return immediately
    if (await this.crdtService.isJobAlreadyQueuedForUser(userId)) {
      return;
    }

    // Otherwise, we enqueue a job to process the buffer for the user
    await this.crdtQueue.add(
      'process-buffer',
      { userId, requesterId, isEmptySync },
      JOB_SETTINGS,
    );
  }

  /**
   * [Not in Use] Gets all lists for a given user.
   * @param userId - The ID of the user.
   * @returns All lists for the given user.
   */
  async getLists(userId: string): Promise<List[]> {
    return this.prisma.list.findMany({ where: { ownerId: userId } });
  }

  /**
   * Gets a single list by ID.
   * @param id - The ID of the list.
   * @returns The list with the given ID, plus the owner's username.
   */
  async getList(id: string): Promise<List & { owner: Partial<User> }> {
    const list = await this.prisma.list.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!list) {
      throw new NotFoundException(`List with ID ${id} not found`);
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: list?.ownerId },
      select: {
        username: true,
      },
    });

    return { ...list, owner };
  }
}
