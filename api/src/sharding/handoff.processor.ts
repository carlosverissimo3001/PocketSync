// src/sharding/handoff.processor.ts

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ShardRouterService } from './shardRouter.service';
import { Logger } from '@nestjs/common';

@Processor('handoff')
export class HandoffProcessor {
  private readonly logger = new Logger(HandoffProcessor.name);

  constructor(private readonly shardRouterService: ShardRouterService) {}

  @Process('handoff')
  async handleHandoff(job: Job) {
    const { originalShard, fallbackShard, operation, model, data } = job.data;
    try {
      const originalPrisma = this.shardRouterService['shardClients'][originalShard];
      if (!originalPrisma) throw new Error(`Original shard ${originalShard} not found`);

      // Perform the operation on the original shard
      await originalPrisma[model][operation](data);

      this.logger.log(`Handoff successful: Operation ${operation} on model ${model} for data ${JSON.stringify(data)} moved back to ${originalShard}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Handoff failed for shard ${originalShard}: ${error.message}`);
      } else {
        this.logger.error(`Handoff failed for shard ${originalShard}: ${JSON.stringify(error)}`);
      }
      // Optionally, re-enqueue the job for later retry
      throw error; // Bull will handle retries based on queue configuration
    }
  }
}
