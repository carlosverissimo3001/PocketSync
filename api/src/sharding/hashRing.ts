import * as crypto from 'crypto';

interface ShardInfo {
  name: string;
  connectionUrl: string;
}

export class HashRing {
  private ring: Map<number, ShardInfo> = new Map();
  private sortedKeys: number[] = [];
  private virtualNodesPerShard: number;

  constructor(virtualNodesPerShard = 100) {
    this.virtualNodesPerShard = virtualNodesPerShard;
  }

  private hashKey(key: string): number {
    const hash = crypto.createHash('sha1').update(key).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  addShard(shard: ShardInfo) {
    for (let i = 0; i < this.virtualNodesPerShard; i++) {
      const virtualKey = `${shard.name}#${i}`;
      const pos = this.hashKey(virtualKey);
      this.ring.set(pos, shard);
      this.sortedKeys.push(pos);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  /**
   * Get the top N shards for a given key.
   * @param key The key to hash.
   * @param n Number of replicas.
   * @returns Array of ShardInfo responsible for the key.
   */
  getShardsForKey(key: string, n: number): ShardInfo[] {
    const hashVal = this.hashKey(key);
    const shards: ShardInfo[] = [];
    const uniqueShardNames = new Set<string>();

    // Binary search to find the starting point
    let start = 0;
    let end = this.sortedKeys.length - 1;
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const midVal = this.sortedKeys[mid];
      if (midVal === hashVal) {
        start = mid;
        break;
      } else if (midVal > hashVal) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }

    // Wrap around if necessary
    let index = start % this.sortedKeys.length;

    // Collect N unique shards
    while (shards.length < n) {
      const shard = this.ring.get(this.sortedKeys[index]);
      if (shard && !uniqueShardNames.has(shard.name)) {
        shards.push(shard);
        uniqueShardNames.add(shard.name);
      }
      index = (index + 1) % this.sortedKeys.length;
      // Prevent infinite loop if N > number of shards
      if (index === start) break;
    }

    return shards;
  }

  getShardForKey(key: string): ShardInfo {
    const shards = this.getShardsForKey(key, 1);
    return shards[0];
  }

  /**
   * Remove a shard from the ring (for failure handling).
   * @param shardName The name of the shard to remove.
   */
  removeShard(shardName: string): void {
    for (let i = 0; i < this.virtualNodesPerShard; i++) {
      const virtualKey = `${shardName}#${i}`;
      const pos = this.hashKey(virtualKey);
      this.ring.delete(pos);
      const keyIndex = this.sortedKeys.indexOf(pos);
      if (keyIndex !== -1) {
        this.sortedKeys.splice(keyIndex, 1);
      }
    }
  }
}
