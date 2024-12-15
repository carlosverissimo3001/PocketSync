import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ShardRouterService } from './shardRouter.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule,
    BullModule.forRootAsync({
      imports: [],
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        },
      }),
      inject: [],
    }),
    BullModule.registerQueue({
      name: 'handoff',
    }),
  ],
  providers: [ShardRouterService],
  exports: [ShardRouterService],
})
export class ShardRouterModule {}
