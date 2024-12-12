import { CRDTModule } from '@/crdt/crdt.module';
import { ZmqModule } from '@/zmq/zmq.module';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { ShardRouterService } from '@/sharding/shardRouter.service';

@Module({
  imports: [
    PrismaModule,
    ZmqModule,
    CRDTModule,
    BullModule.registerQueue({
      name: 'crdt',
    }),
  ],
  providers: [ListsService,ShardRouterService],
  controllers: [ListsController],
  exports: [ListsService],
})
export class ListsModule {}
