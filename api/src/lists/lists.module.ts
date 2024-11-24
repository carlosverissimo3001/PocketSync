import { Module } from '@nestjs/common';
import { ListsService } from './lists.service';
import { ListsController } from './lists.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ZmqModule } from '@/zmq/zmq.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    PrismaModule,
    ZmqModule,
    BullModule.registerQueue({
      name: 'crdt',
    }),
  ],
  providers: [ListsService],
  controllers: [ListsController],
  exports: [ListsService],
})
export class ListsModule {}
