import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ShardRouterService } from './shardRouter.service';
import { HandoffProcessor } from './handoff.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'handoff',
    }),
  ],
  providers: [ShardRouterService, HandoffProcessor],
  exports: [ShardRouterService],
})
export class ShardRouterModule {}
