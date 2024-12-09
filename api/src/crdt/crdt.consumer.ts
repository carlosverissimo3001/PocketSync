import { PrismaService } from '@/prisma/prisma.service';
import { ZmqService } from '@/zmq/zmq.service';
import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ProcessBufferDto } from '@/dtos/process-buffer.dto';
import { CRDTService } from './crdt.service';
import { List } from '@/entities';

@Injectable()
@Processor('crdt')
export class CRDTConsumer {
  private readonly logger = new Logger(CRDTConsumer.name);

  constructor(
    private readonly zmqService: ZmqService,
    private readonly prisma: PrismaService,
    private readonly crdtService: CRDTService,
  ) {}

  @Process('process-buffer')
  async handleProcessBuffer(job: Job<ProcessBufferDto>) {
    try {
      const { isEmptySync, userId, requesterId } = job.data;

      // Entry validation
      if (!userId) {
        this.logger.error('Missing userId in job data');
        throw new Error('Invalid job data: Missing userId');
      }

      if (isEmptySync) {
        this.logger.log('Handling empty sync for userId: ${userId}');
        await this.handleEmptySync(userId);
        return;
      }

      this.logger.log('Processing buffer for userId: ${userId}');

      // Fetch unresolved changes for the user
      const bufferedChanges = await this.prisma.bufferedChange.findMany({
        where: { userId, resolved: false },
        orderBy: { timestamp: 'asc' },
      });

      if (bufferedChanges.length === 0) {
        this.logger.warn('No buffered changes found for userId: ${userId}');
        return;
      }

      // Group these changes by list ID for batch processing
      const changesByList = bufferedChanges.reduce(
        (acc, change) => {
          acc[change.listId] = acc[change.listId] || [];
          acc[change.listId].push(change);
          return acc;
        },
        {} as Record<string, typeof bufferedChanges>,
      );

      const resolvedLists: List[] = [];

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
      this.logger.log('Successfully processed buffer for userId: ${userId}');
    } catch (error) {
      this.logger.error('Error processing buffer:', error.stack);
      throw error; // Rethrow to let Bull handle the retry
    }
  }

  /**
   * If the client sends to lists, it means that it wants to fetch the lists from the server.
   * @param userId - The ID of the user
   */
  private async handleEmptySync(userId: string): Promise<void> {
    try {
      const lists = await this.prisma.list.findMany({
        where: { ownerId: userId },
        include: { items: true },
      });

      if (lists.length === 0) {
        this.logger.warn('No lists found for userId: ${userId}');
      } else {
        this.logger.log('Publishing ${lists.length} lists for userId: ${userId}');
      }

      await this.zmqService.publishUserLists(userId, lists);
    } catch (error) {
      this.logger.error('Error handling empty sync for userId: ${userId}', error.stack);
      throw error;
    }
  }
}
