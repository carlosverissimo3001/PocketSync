import { Module } from '@nestjs/common';
import { CRDTModule } from '@/crdt/crdt.module';
import { ZmqModule } from '@/zmq/zmq.module';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { ShardRouterModule } from '@/sharding/shardRouter.module';

@Module({
  imports: [
    PrismaModule,
    ZmqModule,
    CRDTModule,
    BullModule.registerQueue({
      name: 'crdt',
    }),
    ShardRouterModule,
  ],
  providers: [ListsService], // Removed ShardRouterService
  controllers: [ListsController],
  exports: [ListsService],
})
export class ListsModule {}
