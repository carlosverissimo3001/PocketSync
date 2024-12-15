// src/sharding/shardRouter.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HashRing } from './hashRing';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

interface ShardInfo {
  name: string;
  connectionUrl: string;
}

@Injectable()
export class ShardRouterService implements OnModuleInit {
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

  /**
   * Get N shards responsible for the key.
   * @param key The key to hash.
   * @returns Array of ShardInfo.
   */
  private getShardsForKey(key: string): ShardInfo[] {
    return this.hashRing.getShardsForKey(key, this.N);
  }

  /**
   * Get a PrismaClient proxy that handles replication and quorum.
   * @param key The key to operate on.
   * @returns A proxied PrismaClient instance.
   */
  public async getShardClientForKey(key: string): Promise<PrismaClient> {
    const shards = this.getShardsForKey(key);
    return this.createPrismaProxy(key, shards);
  }

  public async getAllShardClients(): Promise<PrismaClient[]> {
    return Object.values(this.shardClients);
  }

  public async findByIndex(index: number): Promise<PrismaClient> {
    const shardName = Object.keys(this.shardClients)[index];
    return this.shardClients[shardName];
  }

  /**
   * Create a Proxy around PrismaClient to handle replication and quorum.
   * @param key The key associated with the operation.
   * @param shards The shards responsible for the key.
   * @returns A proxied PrismaClient.
   */
  private createPrismaProxy(key: string, shards: ShardInfo[]): PrismaClient {
    const handlers: ProxyHandler<any> = {
      get: (target, prop) => {
        const originalProperty = target[prop];
        if (typeof originalProperty === 'function') {
          return async (...args: any[]) => {
            // Determine if the operation is a read or write
            const operation = prop.toString();

            // List of Prisma methods that are considered write operations
            const writeOperations = ['create', 'update', 'upsert', 'delete', 'deleteMany', 'updateMany'];

            if (writeOperations.includes(operation)) {
              // Write operation: replicate to N shards and wait for W acknowledgments
              return await this.handleWriteOperation(shards, prop.toString(), args);
            } else {
              // Read operation: query N shards and wait for R responses
              return await this.handleReadOperation(shards, prop.toString(), args);
            }
          };
        }
        return originalProperty;
      },
    };

    // Return a Proxy that intercepts PrismaClient method calls
    const dummyPrisma = new PrismaClient(); // Placeholder, won't be used directly
    const proxy = new Proxy(dummyPrisma, handlers);

    return proxy;
  }

  /**
   * Handle write operations with replication and quorum.
   * @param shards The shards to write to.
   * @param operation The Prisma operation name.
   * @param args The arguments for the operation.
   * @returns The result of the write operation.
   */
  private async handleWriteOperation(shards: ShardInfo[], operation: string, args: any[]): Promise<any> {
    const writePromises = shards.map(async (shard) => {
      try {
        const prisma = this.shardClients[shard.name];
        const model = args[0]; // Assuming the first argument is the model name
        const data = args[1]; // The second argument is the data
        // Perform the operation dynamically
        const result = await prisma[model][operation](data);
        this.logger.debug(`Write operation ${operation} succeeded on shard ${shard.name}`);
        return { shard: shard.name, success: true, result };
      } catch (error: unknown) {
        // Type-safe error handling
        if (error instanceof Error) {
          this.logger.error(`Write operation ${operation} failed on ${shard.name}: ${error.message}`);
        } else {
          this.logger.error(`Write operation ${operation} failed on ${shard.name}: ${JSON.stringify(error)}`);
        }
        return { shard: shard.name, success: false, error };
      }
    });

    const results = await Promise.all(writePromises);
    const successfulWrites = results.filter(res => res.success).length;

    if (successfulWrites >= this.W) {
      // Quorum achieved
      const firstSuccess = results.find(res => res.success);
      return firstSuccess ? firstSuccess.result : null;
    } else {
      // Quorum not achieved, handle failure (e.g., hinted handoff)
      const failedShards = results.filter(res => !res.success).map(res => res.shard);
      for (const shardName of failedShards) {
        const fallbackShard = this.selectFallbackShard(shardName);
        if (fallbackShard) {
          // Enqueue hinted handoff
          await this.handoffQueue.add('handoff', {
            originalShard: shardName,
            fallbackShard: fallbackShard.name,
            operation,
            model: args[0],
            data: args[1],
          });
          this.logger.warn(`Hinted handoff enqueued for shard ${shardName} to fallback shard ${fallbackShard.name}`);
        }
      }
      throw new Error(`Write quorum not met for operation ${operation} on key ${args[1]?.id || 'unknown'}`);
    }
  }

  /**
   * Handle read operations with quorum.
   * @param shards The shards to read from.
   * @param operation The Prisma operation name.
   * @param args The arguments for the operation.
   * @returns The result of the read operation.
   */
  private async handleReadOperation(shards: ShardInfo[], operation: string, args: any[]): Promise<any> {
    const readPromises = shards.map(async (shard) => {
      try {
        const prisma = this.shardClients[shard.name];
        const model = args[0]; // Assuming the first argument is the model name
        const query = args[1]; // The second argument is the query
        // Perform the operation dynamically
        const result = await prisma[model][operation](query);
        this.logger.debug(`Read operation ${operation} succeeded on shard ${shard.name}`);
        return { shard: shard.name, success: true, result };
      } catch (error: unknown) {
        // Type-safe error handling
        if (error instanceof Error) {
          this.logger.error(`Read operation ${operation} failed on ${shard.name}: ${error.message}`);
        } else {
          this.logger.error(`Read operation ${operation} failed on ${shard.name}: ${JSON.stringify(error)}`);
        }
        return { shard: shard.name, success: false, error };
      }
    });

    const results = await Promise.all(readPromises);
    const successfulReads = results.filter(res => res.success).map(res => res.result);

    if (successfulReads.length >= this.R) {
      // Quorum achieved, resolve conflicts if necessary
      // For simplicity, return the first successful read
      return successfulReads[0];
    } else {
      // Quorum not achieved
      throw new Error(`Read quorum not met for operation ${operation} on key ${args[1]?.where?.id || 'unknown'}`);
    }
  }

  /**
   * Select a fallback shard for hinted handoff.
   * @param failedShardName The name of the failed shard.
   * @returns A fallback ShardInfo or null.
   */
  private selectFallbackShard(failedShardName: string): ShardInfo | null {
    const allShards = Object.values(this.shardClients);
    const sortedShardKeys = this.hashRing['sortedKeys']; // Access sortedKeys from HashRing
    const ring = this.hashRing['ring']; // Access ring from HashRing

    // Find all virtual nodes for the failed shard
    const virtualNodes = Array.from(ring.entries())
      .filter(([pos, shard]) => shard.name === failedShardName)
      .map(([pos, shard]) => pos)
      .sort((a, b) => a - b);

    // Choose the next shard in the ring after the last virtual node of the failed shard
    if (virtualNodes.length === 0) return null;

    const lastVirtualPos = virtualNodes[virtualNodes.length - 1];
    const index = sortedShardKeys.findIndex((pos) => pos === lastVirtualPos);
    let fallbackIndex = (index + 1) % sortedShardKeys.length;
    while (fallbackIndex !== index) {
      const fallbackShard = ring.get(sortedShardKeys[fallbackIndex]);
      if (fallbackShard.name !== failedShardName) {
        return fallbackShard;
      }
      fallbackIndex = (fallbackIndex + 1) % sortedShardKeys.length;
    }

    return null;
  }

  /**
   * Remove a shard from the ring (for failure handling).
   * @param shardName The name of the shard to remove.
   */
  public removeShard(shardName: string): void {
    this.hashRing.removeShard(shardName);
    delete this.shardClients[shardName];
    this.logger.warn(`Shard ${shardName} removed from the ring and clients`);
  }

  /**
   * Optionally, implement methods to add shards dynamically.
   * This can be useful for scaling or recovery purposes.
   */
  public addShard(shard: ShardInfo): void {
    this.hashRing.addShard(shard);
    this.shardClients[shard.name] = new PrismaClient({
      datasources: { db: { url: shard.connectionUrl } },
    });
    this.logger.log(`Shard ${shard.name} added to the ring and clients`);
  }
}
