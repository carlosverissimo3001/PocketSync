// src/sharding/shardRouter.service.ts

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HashRing } from './hashRing'; // Ensure this is correctly implemented
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

interface ShardInfo {
  name: string;
  connectionUrl: string;
}

@Injectable()
export class ShardRouterService implements OnModuleInit, OnModuleDestroy {
  private hashRing: HashRing;
  private shardClients: Record<string, PrismaClient> = {};
  private readonly logger = new Logger(ShardRouterService.name);

  // Quorum parameters
  private readonly N = parseInt(process.env.QUORUM_N, 10) || 3; // Total replicas
  private readonly R = parseInt(process.env.QUORUM_R, 10) || 2; // Read quorum
  private readonly W = parseInt(process.env.QUORUM_W, 10) || 2; // Write quorum

  constructor(
    @InjectQueue('handoff') private handoffQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    this.hashRing = new HashRing(100);

    // Define shards from environment
    const shards: ShardInfo[] = [
      { name: 'shard-a', connectionUrl: process.env.SHARD_A_URL },
      { name: 'shard-b', connectionUrl: process.env.SHARD_B_URL },
      { name: 'shard-c', connectionUrl: process.env.SHARD_C_URL },
      { name: 'shard-d', connectionUrl: process.env.SHARD_D_URL },
    ];

    for (const shard of shards) {
      if (!shard.connectionUrl) {
        this.logger.error(
          `Connection URL for ${shard.name} is not defined in environment variables.`,
        );
        continue;
      }

      this.hashRing.addShard(shard);
      const prisma = new PrismaClient({
        datasources: { db: { url: shard.connectionUrl } },
      });

      this.shardClients[shard.name] = prisma;

      try {
        await prisma.$connect();
        this.logger.log(
          `Successfully connected to ${shard.name} at ${shard.connectionUrl}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to connect to ${shard.name} at ${shard.connectionUrl}: ${(error as Error).message}`,
        );
      }
    }
  }

  async onModuleDestroy() {
    for (const [shardName, client] of Object.entries(this.shardClients)) {
      try {
        await client.$disconnect();
        this.logger.log(
          `PrismaClient for shard ${shardName} disconnected successfully.`,
        );
      } catch (error) {
        this.logger.error(
          `Error disconnecting PrismaClient for shard ${shardName}: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Get the shard responsible for a given key.
   * @param key The key to hash.
   * @returns ShardInfo
   */
  public getShardForKey(key: string): ShardInfo {
    return this.hashRing.getShardForKey(key);
  }

  /**
   * Get the shard responsible for a User based on userId.
   * @param userId The User's ID.
   * @returns ShardInfo
   */
  public getShardForUser(userId: string): ShardInfo {
    return this.getShardForKey(`user:${userId}`);
  }

  /**
   * Get the PrismaClient for a specific shard.
   * @param shardName The name of the shard.
   * @returns PrismaClient
   */
  public getPrismaClient(shardName: string): PrismaClient {
    const prisma = this.shardClients[shardName];
    if (!prisma) {
      this.logger.error(`PrismaClient for shard ${shardName} not found.`);
      throw new Error(`PrismaClient for shard ${shardName} not found.`);
    }
    return prisma;
  }

  /**
   * Get all PrismaClients across shards.
   * @returns Array of PrismaClient instances.
   */
  public async getAllShardClients(): Promise<PrismaClient[]> {
    return Object.values(this.shardClients);
  }

  /**
   * Get a PrismaClient by shard index.
   * @param index The index of the shard.
   * @returns PrismaClient
   */
  public async findByIndex(index: number): Promise<PrismaClient> {
    const shardNames = Object.keys(this.shardClients);
    const shardName = shardNames[index];
    if (!shardName) {
      this.logger.error(`Shard at index ${index} does not exist.`);
      throw new Error(`Shard at index ${index} does not exist.`);
    }
    return this.getPrismaClient(shardName);
  }

  /**
   * Remove a shard from the ring (for failure handling).
   * @param shardName The name of the shard to remove.
   */
  public removeShard(shardName: string): void {
    this.hashRing.removeShard(shardName);
    const prisma = this.shardClients[shardName];
    if (prisma) {
      prisma
        .$disconnect()
        .then(() => {
          delete this.shardClients[shardName];
          this.logger.warn(
            `Shard ${shardName} removed from the ring and PrismaClient disconnected.`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Error disconnecting PrismaClient for shard ${shardName}: ${(error as Error).message}`,
          );
        });
    } else {
      this.logger.warn(`Shard ${shardName} not found among connected shards.`);
    }
  }

  /**
   * Add a new shard to the ring.
   * @param shard The ShardInfo object for the new shard.
   */
  public async addShard(shard: ShardInfo): Promise<void> {
    if (!shard.connectionUrl) {
      this.logger.error(`Connection URL for ${shard.name} is not defined.`);
      throw new Error(`Connection URL for ${shard.name} is not defined.`);
    }

    this.hashRing.addShard(shard);
    const prisma = new PrismaClient({
      datasources: { db: { url: shard.connectionUrl } },
    });

    this.shardClients[shard.name] = prisma;

    try {
      await prisma.$connect();
      this.logger.log(
        `Successfully connected to new shard ${shard.name} at ${shard.connectionUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to connect to new shard ${shard.name} at ${shard.connectionUrl}: ${(error as Error).message}`,
      );
      delete this.shardClients[shard.name];
      throw error;
    }
  }

  /**
   * Get N shards responsible for the key.
   * @param key The key to hash.
   * @returns Array of ShardInfo.
   */
  private getShardsForKey(key: string): ShardInfo[] {
    return this.hashRing.getShardsForKey(key, this.N);
  }

  /**
   * Select a fallback shard for hinted handoff.
   * @param failedShardName The name of the failed shard.
   * @returns A fallback ShardInfo or null.
   */
  private selectFallbackShard(failedShardName: string): ShardInfo | null {
    const allShards = Object.values(this.shardClients);
    const sortedShardKeys = this.hashRing.getSortedKeys();
    const ring = this.hashRing.getRing();

    // Find all virtual nodes for the failed shard
    const virtualNodes = sortedShardKeys.filter(
      (pos) => ring.get(pos)?.name === failedShardName,
    );

    if (virtualNodes.length === 0) {
      this.logger.warn(`No virtual nodes found for shard ${failedShardName}`);
      return null;
    }

    // Choose the next shard in the ring after the last virtual node of the failed shard
    const lastVirtualPos = virtualNodes[virtualNodes.length - 1];
    const index = sortedShardKeys.indexOf(lastVirtualPos);
    let fallbackIndex = (index + 1) % sortedShardKeys.length;

    while (fallbackIndex !== index) {
      const fallbackShard = ring.get(sortedShardKeys[fallbackIndex]);
      if (fallbackShard && fallbackShard.name !== failedShardName) {
        return fallbackShard;
      }
      fallbackIndex = (fallbackIndex + 1) % sortedShardKeys.length;
    }

    this.logger.warn(
      `No suitable fallback shard found for failed shard ${failedShardName}`,
    );
    return null;
  }
}
