import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ListsModule } from './lists/lists.module';
import { PrismaModule } from './prisma/prisma.module';
import { ZmqModule } from './zmq/zmq.module';
import { BullModule } from '@nestjs/bull';
import { CRDTModule } from './crdt/crdt.module';
import { ShardRouterService } from './sharding/shardRouter.service';
import { HashRing } from './sharding/hashRing';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    CRDTModule,
    UsersModule,
    ListsModule,
    PrismaModule,
    ZmqModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
