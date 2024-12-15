// src/users/users.service.ts

import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private jwtService: JwtService,
    private shardRouterService: ShardRouterService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Logs in a user by verifying their credentials.
   * If the user does not exist, creates a new user in the appropriate shards with replication.
   * @param username The username of the user.
   * @param password The password of the user.
   * @returns An object containing the user (without password), JWT token, and validation status.
   */
  async login(username: string, password: string) {
    try {
      // Search for the user with read quorum
      const user = await this.shardRouterService.readWithQuorum<UserEntity>(
        `user:${username}`,
        async (prisma) => {
          return await prisma.user.findUnique({ where: { username } });
        },
      );

      if (!user) {
        // If user does not exist, create them with replication
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuid();

        // Define user data
        const userData = {
          id: userId,
          username,
          password: hashedPassword,
          createdAt: new Date(),
        };

        // Write to multiple shards with write quorum
        await this.shardRouterService.writeWithQuorum(
          `user:${userId}`,
          async (prisma) => {
            await prisma.user.create({ data: userData });
          },
        );

        this.logger.log(
          `Created new user '${username}' with ID '${userId}' across multiple shards.`,
        );

        // Cache the user ID to username mapping for subsequent logins
        await this.cacheManager.set(
          `user:${userId}`,
          username,
          60 * 60 * 1000, // 1 hour in milliseconds
        );

        const token = this.generateJwt(userData);
        return { user: this.omitPassword(userData), token, isValid: true };
      } else {
        // If user exists, check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          this.logger.warn(`Invalid password attempt for user '${username}'`);
          throw new UnauthorizedException('Invalid username or password');
        }

        // Cache the user ID to username mapping for subsequent logins
        await this.cacheManager.set(
          `user:${user.id}`,
          user.username,
          60 * 60 * 1000, // 1 hour in milliseconds
        );

        const token = this.generateJwt(user);
        return { user: this.omitPassword(user), token, isValid: true };
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw authentication errors
      }
      this.logger.error(
        `Error during login for username '${username}': ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves a user by their ID with read quorum.
   * @param id The ID of the user.
   * @returns The user entity or null if not found.
   */
  async findUserById(id: string) {
    try {
      const user = await this.shardRouterService.readWithQuorum<UserEntity>(
        `user:${id}`,
        async (prisma) => {
          return await prisma.user.findUnique({ where: { id } });
        },
      );

      if (user) {
        this.logger.log(
          `Retrieved user '${user.username}' with ID '${id}'.`,
        );
      } else {
        this.logger.warn(
          `User with ID '${id}' not found across all shards.`,
        );
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Error finding user by ID '${id}': ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Verifies a JWT token and retrieves the associated user with read quorum.
   * @param token The JWT token to verify.
   * @returns An object indicating whether the token is valid and the user details if valid.
   */
  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      // Use ID for sharding
      const user = await this.shardRouterService.readWithQuorum<UserEntity>(
        `user:${payload.id}`,
        async (prisma) => {
          return await prisma.user.findUnique({
            where: { id: payload.id },
          });
        },
      );

      if (!user) {
        this.logger.warn(
          `User with ID '${payload.id}' not found during token verification.`,
        );
        return { isValid: false, message: 'User not found' };
      }

      return {
        isValid: true,
        user: {
          id: user.id,
          username: user.username,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Token verification failed: ${(error as Error).message}`,
      );
      return { isValid: false, message: 'Invalid token' };
    }
  }

  /**
   * Generates a JWT token for the user.
   * @param user The user entity.
   * @returns The JWT token as a string.
   */
  private generateJwt(user: UserEntity): string {
    return jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: '3h',
      },
    );
  }

  /**
   * Omits the password field from the user object.
   * @param user The user object.
   * @returns The user object without the password.
   */
  private omitPassword(user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  /**
   * Finds the shard responsible for a given username by searching all shards with read quorum.
   * @param username The username to search for.
   * @returns The PrismaClient of the shard containing the user or null if not found.
   */
  async getShardForUsername(username: string): Promise<PrismaClient | null> {
    try {
      const user = await this.shardRouterService.readWithQuorum<UserEntity>(
        `user:${username}`,
        async (prisma) => {
          return await prisma.user.findUnique({ where: { username } });
        },
      );

      if (user) {
        this.logger.log(`Found user '${username}' in shard '${user.id}'.`);
        return this.shardRouterService.getPrismaClient(
          this.shardRouterService.getShardForUser(user.id).name,
        );
      }

      this.logger.warn(`User '${username}' not found in any shard.`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error searching for username '${username}': ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
