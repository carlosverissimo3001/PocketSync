import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ListsModule } from './lists/lists.module';
import { PrismaModule } from './prisma/prisma.module';
import { ZmqModule } from './zmq/zmq.module';
import { BullModule } from '@nestjs/bull';
import { CRDTModule } from './crdt/crdt.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ShardRouterModule } from './sharding/shardRouter.module';
import { LIST_CACHE_TTL } from './consts/consts';
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: LIST_CACHE_TTL,
      max: 100,
    }),
    CRDTModule,
    UsersModule,
    ListsModule,
    PrismaModule,
    ZmqModule,
    ShardRouterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
