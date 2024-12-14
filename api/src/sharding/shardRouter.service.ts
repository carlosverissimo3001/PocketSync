import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HashRing } from './hashRing';

@Injectable()
export class ShardRouterService implements OnModuleInit {
  private hashRing: HashRing;
  private shardClients: Record<string, PrismaClient> = {};

  onModuleInit() {
    this.hashRing = new HashRing(100);

    // Define shards from environment
    const shards = [
      { name: 'shard-a', connectionUrl: process.env.SHARD_A_URL },
      { name: 'shard-b', connectionUrl: process.env.SHARD_B_URL },
      { name: 'shard-c', connectionUrl: process.env.SHARD_C_URL },
    ];

    for (const shard of shards) {
      this.hashRing.addShard(shard);
      this.shardClients[shard.name] = new PrismaClient({
        datasources: { db: { url: shard.connectionUrl } },
      });
    }
  }

  public async getShardClientForKey(key: string): Promise<PrismaClient> {
    const shard = this.hashRing.getShardForKey(key);
    return this.shardClients[shard.name];
  }

  public async getAllShardClients(): Promise<PrismaClient[]> {
    return Object.values(this.shardClients);
  }

  public async findByIndex(index: number): Promise<PrismaClient> {
    return this.shardClients[index];
  }
}
