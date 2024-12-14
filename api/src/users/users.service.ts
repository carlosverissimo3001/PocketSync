import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserEntity } from 'src/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ShardRouterService } from '@/sharding/shardRouter.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
@Injectable()
export class UsersService {
  constructor(
    private jwtService: JwtService,
    private shardRouterService: ShardRouterService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async login(username: string, password: string) {
    // Search all shards for the user
    let user = null;
    let prisma = await this.getShardForUsername(username);

    // If user does not exist in any shard, create them in the appropriate shard
    if (!prisma) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuid();
      prisma = await this.shardRouterService.getShardClientForKey(userId);

      // Create user in the shard
      user = await prisma.user.create({
        data: {
          id: userId,
          username,
          password: hashedPassword,
        },
      });
    } else {
      user = await prisma.user.findUnique({ where: { username } });
      // If user exists, check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return null;
    }

    // Cache the user ID to username mapping for subsequent logins
    if (user) {
      await this.cacheManager.set(
        `user:${user.id}`,
        user.username,
        60 * 60 * 1000,
      );
    }

    const token = this.generateJwt(user);
    return { user: this.omitPassword(user), token, isValid: true };
  }

  private omitPassword(user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  // Generates a JWT token for the user
  private generateJwt(user: UserEntity) {
    return jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: '3h',
      },
    );
  }

  async findUserById(id: string) {
    const prisma = await this.shardRouterService.getShardClientForKey(id);
    return prisma.user.findUnique({ where: { id } });
  }

  async verifyToken(token: string) {
    const payload = this.jwtService.verify(token);

    // Use ID for sharding
    const prisma = await this.shardRouterService.getShardClientForKey(
      payload.id,
    );

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return { isValid: false, message: 'User not found' };
    }

    return {
      isValid: true,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  async getShardForUsername(username: string): Promise<PrismaClient | null> {
    const shards = await this.shardRouterService.getAllShardClients();
    for (const shard of shards) {
      const user = await shard.user.findUnique({ where: { username } });
      if (user) return shard;
    }
    return null;
  }
}
