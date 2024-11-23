import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CrdtConsumer } from './crdt.consumer';
import { ZmqModule } from '@/zmq/zmq.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crdt',
    }),
    ZmqModule,
    PrismaModule,
  ],
  providers: [CrdtConsumer],
  exports: [BullModule],
})
export class CrdtModule {}
