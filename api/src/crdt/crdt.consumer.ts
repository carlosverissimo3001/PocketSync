import { PrismaService } from '@/prisma/prisma.service';
import { ZmqService } from '@/zmq/zmq.service';
import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { ProcessBufferDto } from '@/dtos/process-buffer.dto';
import { CRDTService } from './crdt.service';
import { User } from '@prisma/client';
import { List } from '@/entities';

@Injectable()
@Processor('crdt')
export class CRDTConsumer {
  constructor(
    private readonly zmqService: ZmqService,
    private readonly prisma: PrismaService,
    private readonly crdtService: CRDTService,
  ) {}

  @Process('process-buffer')
  async handleProcessBuffer(job: Job<ProcessBufferDto>) {
    try {
      const { isEmptySync, userId, requesterId } = job.data;

      if (isEmptySync) {
        await this.handleEmptySync(userId);
        return;
      }

      // Fetch unresolved changes for the user
      const bufferedChanges = await this.prisma.bufferedChange.findMany({
        where: { userId, resolved: false },
        orderBy: { timestamp: 'asc' }, // Optional, for deterministic processing
      });

      // Group these changes by list ID for batch processing
      const changesByList = bufferedChanges.reduce(
        (acc, change) => {
          acc[change.listId] = acc[change.listId] || [];
          acc[change.listId].push(change);
          return acc;
        },
        {} as Record<string, typeof bufferedChanges>,
      );

      const resolvedLists = [];

      // For each list, resolve the changes
      for (const listId in changesByList) {
        const resolvedList = await this.crdtService.resolveChanges(
          changesByList[listId],
          listId,
          requesterId,
        );
        resolvedLists.push(resolvedList);
      }

      // Mark the changes as resolved
      await this.prisma.bufferedChange.updateMany({
        where: { id: { in: bufferedChanges.map((change) => change.id) } },
        data: { resolved: true },
      });

      // Publish the resolved lists to all the client's subscribers
      await this.zmqService.publishUserLists(userId, resolvedLists);
    } catch (error) {
      console.error('Error processing buffer:', error);
      throw error; // Rethrow to let Bull handle the retry
    }
  }

  /**
   * If the client sends to lists, it means that it wants to fetch the lists from the server.
   * @param userId - The ID of the user
   */
  private async handleEmptySync(userId: string): Promise<void> {
    const lists = await this.prisma.list.findMany({
      where: { ownerId: userId },
      include: { items: true },
    });
    await this.zmqService.publishUserLists(userId, lists);
  }
}
