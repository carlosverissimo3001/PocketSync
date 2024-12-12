import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ZmqModule } from '@/zmq/zmq.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { CRDTService } from './crdt.service';
import { CRDTConsumer } from './crdt.consumer';
import { ShardRouterService } from '@/sharding/shardRouter.service';


@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crdt',
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
      },
    }),
    ZmqModule,
    PrismaModule,
  ],
  providers: [CRDTService, CRDTConsumer,ShardRouterService],
  exports: [CRDTService],
})
export class CRDTModule {}
