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

  getShardForKey(key: string): ShardInfo {
    const hashVal = this.hashKey(key);
    let start = 0;
    let end = this.sortedKeys.length - 1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const midVal = this.sortedKeys[mid];
      if (midVal === hashVal) {
        return this.ring.get(midVal)!;
      } else if (midVal > hashVal) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }

    const pos =
      start === this.sortedKeys.length
        ? this.sortedKeys[0]
        : this.sortedKeys[start];
    return this.ring.get(pos)!;
  }
}
