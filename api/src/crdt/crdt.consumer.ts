// src/crdt/crdt.consumer.ts

/**
 * CRDTConsumer
 *
 * This consumer class processes tasks in the CRDT queue. It handles operations such as:
 * - Processing buffered changes for users.
 * - Publishing resolved lists to clients.
 * - Cleaning up resolved buffer changes.
 *
 * The consumer is integrated with ZMQ for publishing updates, uses Prisma for database
 * operations, and relies on a CRDTService for resolving conflicts in data changes.
 */

import { ZmqService } from '@/zmq/zmq.service';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { ProcessBufferDto } from '@/dtos/process-buffer.dto';
import { CRDTService } from './crdt.service';
import { Validate } from 'class-validator';
import { CRDT_QUEUE, BUFFER_CLEANUP_CRON } from '@/consts/consts';
import { ShardRouterService } from '@/sharding/shardRouter.service';

@Processor('crdt')
@Injectable()
export class CRDTConsumer {
  private readonly logger = new Logger(CRDTConsumer.name);

  constructor(
    private readonly zmqService: ZmqService,
    private readonly crdtService: CRDTService,
    private readonly shardRouterService: ShardRouterService,
    @InjectQueue(CRDT_QUEUE) private readonly crdtQueue: Queue,
  ) {}

  /**
   * Schedules a recurring job to clean up resolved buffer changes.
   * This is executed on module initialization.
   */
  async onModuleInit() {
    await this.crdtQueue.add(
      'cleanup-buffer',
      {},
      {
        repeat: { cron: BUFFER_CLEANUP_CRON },
      },
    );
    this.logger.log('Scheduled buffer cleanup cron job.');
  }

  /**
   * Processes the buffered changes for a user.
   * If the buffer is empty, it fetches the lists from the database for the user.
   *
   * @param job - The job containing the `ProcessBufferDto` data.
   */
  @Process('process-buffer')
  async handleProcessBuffer(job: Job<ProcessBufferDto>) {
    try {
      const { isEmptySync, userId } = job.data;

      if (isEmptySync) {
        this.logger.log(`Handling empty sync for userId: ${userId}`);
        await this.handleEmptySync(userId);
        return;
      }

      this.logger.log(`Processing buffer for userId: ${userId}`);

      // **Refactored Shard Retrieval**
      // Determine the shard for the user and retrieve the PrismaClient
      const shard = this.shardRouterService.getShardForUser(userId);
      const prisma = this.shardRouterService.getPrismaClient(shard.name);

      // Fetch unresolved changes
      const bufferedChanges = await prisma.bufferedChange.findMany({
        where: { userId, resolved: false },
        orderBy: { timestamp: 'asc' },
      });

      if (bufferedChanges.length === 0) {
        this.logger.warn(`No buffered changes found for userId: ${userId}`);
        return;
      }

      // Group changes by list ID
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
          userId,
        );
      }

      // Mark changes as resolved
      await prisma.bufferedChange.updateMany({
        where: { id: { in: bufferedChanges.map((change) => change.id) } },
        data: { resolved: true },
      });

      // Get the lists from the database
      const lists = await prisma.list.findMany({
        where: { ownerId: userId },
        include: { items: true },
      });

      // Publish the resolved lists to all the client's subscribers
      await this.zmqService.publishUserLists(userId, lists);
      this.logger.log(`Successfully processed buffer for userId: ${userId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error('Error processing buffer:', err.stack);
      throw error;
    }
  }

  /**
   * Handles an empty synchronization request from the client.
   * This fetches the current state of the user's lists from the server.
   *
   * @param userId - The ID of the user requesting an empty sync.
   */
  private async handleEmptySync(userId: string): Promise<void> {
    try {
      // **Refactored Shard Retrieval**
      // Determine the shard for the user and retrieve the PrismaClient
      const shard = this.shardRouterService.getShardForUser(userId);
      const prisma = this.shardRouterService.getPrismaClient(shard.name);

      const lists = await prisma.list.findMany({
        where: { ownerId: userId },
        include: { items: true },
      });

      if (lists.length === 0) {
        this.logger.warn(`No lists found for userId: ${userId}`);
      } else {
        this.logger.log(
          `Publishing ${lists.length} lists for userId: ${userId}`,
        );
      }

      await this.zmqService.publishUserLists(userId, lists);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error handling empty sync for userId: ${userId}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Cleans up resolved buffer changes that are older than one hour.
   * This is triggered periodically based on a cron job.
   */
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
