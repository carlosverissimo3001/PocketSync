import { PrismaService } from '@/prisma/prisma.service';
import { ZmqService } from '@/zmq/zmq.service';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { ProcessBufferDto } from '@/dtos/process-buffer.dto';
import { CRDTService } from './crdt.service';
import { List } from '@/entities';
import { CRDT_QUEUE } from '@/consts/consts';
import { BUFFER_CLEANUP_CRON } from '@/consts/consts';
import { Validate } from 'class-validator';

@Injectable()
@Processor('crdt')
export class CRDTConsumer {
  private readonly logger = new Logger(CRDTConsumer.name);

  constructor(
    private readonly zmqService: ZmqService,
    private readonly prisma: PrismaService,
    private readonly crdtService: CRDTService,
    @InjectQueue(CRDT_QUEUE) private readonly crdtQueue: Queue,
  ) {}

  // Cleans up the resolved buffer changes every hour
  async onModuleInit() {
    await this.crdtQueue.add(
      'cleanup-buffer',
      {},
      {
        repeat: { cron: BUFFER_CLEANUP_CRON },
      },
    );
  }

  @Process('process-buffer')
  @Validate(ProcessBufferDto)
  async handleProcessBuffer(job: Job<ProcessBufferDto>) {
    try {
      const { isEmptySync, userId, requesterId } = job.data;

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

      // For each list, resolve the changes
      for (const listId in changesByList) {
        await this.crdtService.resolveChanges(
          changesByList[listId],
          listId,
          requesterId,
        );
      }

      // Mark the changes as resolved
      await this.prisma.bufferedChange.updateMany({
        where: { id: { in: bufferedChanges.map((change) => change.id) } },
        data: { resolved: true },
      });

      // Get the lists from the database
      const lists = await this.prisma.list.findMany({
        where: { ownerId: userId },
        include: { items: true },
      });

      // Publish the resolved lists to all the client's subscribers
      await this.zmqService.publishUserLists(userId, lists);
      this.logger.log('Successfully processed buffer for userId: ${userId}');
    } catch (error) {
      this.logger.error('Error processing buffer:', error.stack);
      throw error; // Rethrow to let Bull handle the retry
    }
  }

  /**
   * If the client sends no lists or there are no changes to the lists,
   * it means that they want to fetch the lists from the server.
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
        this.logger.log(
          'Publishing ${lists.length} lists for userId: ${userId}',
        );
      }

      await this.zmqService.publishUserLists(userId, lists);
    } catch (error) {
      this.logger.error(
        'Error handling empty sync for userId: ${userId}',
        error.stack,
      );
      throw error;
    }
  }

  @Process('cleanup-buffer')
  async handleBufferCleanup() {
    this.logger.log(
      `Starting buffer cleanup job... Current time: ${new Date().toISOString()}`,
    );

    try {
      const result = await this.crdtService.cleanupResolvedBufferChanges();
      this.logger.log(`Cleaned up ${result.count} resolved buffer changes`);
      return result;
    } catch (error) {
      this.logger.error('Failed to cleanup buffer changes:', error);
      throw error;
    }
  }
}
