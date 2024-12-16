// src/users/users.service.ts

import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserEntity } from 'src/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ShardRouterService } from '@/sharding/shardRouter.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { CreateUserDto } from '@/dtos';

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
   * If the user does not exist, creates a new user in the appropriate shard.
   * @param username The username of the user.
   * @param password The password of the user.
   * @returns An object containing the user (without password), JWT token, and validation status.
   */
  async login(data: CreateUserDto) {
    const { username, password } = data;

    try {
      // Search all shards for the user
      let user = null;
      const prisma = await this.getShardForUsername(username);

      if (prisma) {
        user = await prisma.user.findUnique({ where: { username } });
      }

      // If user exists, check password
      if (user) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          this.logger.warn(`Invalid password attempt for user '${username}'`);
          throw new UnauthorizedException('Invalid username or password');
        }

        await this.cacheManager.set(
          `user:${user.id}`,
          user.username,
          3600, // 1 hour in seconds
        );

        const token = this.generateJwt(user);
        return { user: this.omitPassword(user), token, isValid: true };
      } else {
        throw new NotFoundException('User does not exist');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error; // Re-throw authentication and not found errors
      }
      this.logger.error(
        `Error during login for username '${username}': ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Registers a new user by creating them across multiple shards to ensure replication.
   * @param data The registration data containing username and password.
   * @returns An object indicating the success status and message.
   */
  async register(data: CreateUserDto) {
    const { username, password } = data;

    // Pre-write check: Ensure username is unique across all shards
    const isTaken = await this.isUsernameTaken(username);
    if (isTaken) {
      this.logger.warn(`Attempt to register with taken username '${username}'`);
      throw new ConflictException(
        'User already exists. If this is your account, please login instead.',
      );
    }

    // Create new user data
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuid();

    const userData = {
      id: userId,
      username,
      password: hashedPassword,
      createdAt: new Date(),
    };

    // Define sharding key based on userId
    const shardKey = userId;

    try {
      // Use writeWithQuorum to replicate the user across shards
      await this.shardRouterService.writeWithQuorum(
        shardKey,
        async (prisma: PrismaClient) => {
          // Use upsert to handle existing records gracefully
          await prisma.user.upsert({
            where: { id: userId },
            update: {}, // No updates; creating new user
            create: userData,
          });
        },
      );

      this.logger.log(
        `Successfully registered user '${username}' with ID '${userId}' across shards.`,
      );

      // Optionally, cache the user ID to username mapping
      await this.cacheManager.set(
        `${userId}`,
        username,
        3600, // 1 hour in seconds
      );

      return { success: true, message: 'User registered successfully' };
    } catch (error) {
      this.logger.error(
        `Error registering user '${username}': ${(error as Error).message}`,
      );
      throw new ConflictException('Failed to register user. Please try again.');
    }
  }

  /**
   * Checks if a username already exists across all shards using read quorum.
   * @param username The username to check.
   * @returns A boolean indicating whether the username exists.
   */
  async isUsernameTaken(username: string): Promise<boolean> {
    try {
      const key = `username:${username}`; // Sharding key based on username
      const exists = await this.shardRouterService.readWithQuorum<boolean>(
        key,
        async (prisma: PrismaClient) => {
          const user = await prisma.user.findUnique({ where: { username } });
          return user ? true : false;
        },
      );
      return exists;
    } catch (error) {
      this.logger.error(
        `Error checking if username '${username}' is taken: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves a user by their ID.
   * @param id The ID of the user.
   * @returns The user entity or null if not found.
   */
  async findUserById(id: string) {
    try {
      // Determine the shard for the user based on userId
      const shard = this.shardRouterService.getShardForUser(id);
      const prisma: PrismaClient = this.shardRouterService.getPrismaClient(
        shard.name,
      );

      const user = await prisma.user.findUnique({ where: { id } });
      if (user) {
        this.logger.log(
          `Retrieved user '${user.username}' from shard '${shard.name}'`,
        );
      } else {
        this.logger.warn(
          `User with ID '${id}' not found in shard '${shard.name}'`,
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
   * Verifies a JWT token and retrieves the associated user.
   * @param token The JWT token to verify.
   * @returns An object indicating whether the token is valid and the user details if valid.
   */
  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      // Use ID for sharding
      const shard = this.shardRouterService.getShardForUser(payload.id);
      const prisma: PrismaClient = this.shardRouterService.getPrismaClient(
        shard.name,
      );

      const user = await prisma.user.findUnique({
        where: { id: payload.id },
      });

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
   * Finds the shard responsible for a given username by searching all shards.
   * @param username The username to search for.
   * @returns The PrismaClient of the shard containing the user or null if not found.
   */
  async getShardForUsername(username: string): Promise<PrismaClient | null> {
    try {
      // Use readWithQuorum to search for the user across shards
      const key = `username:${username}`;
      const shardPrisma = await this.shardRouterService.readWithQuorum<PrismaClient | null>(
        key,
        async (prisma: PrismaClient) => {
          const user = await prisma.user.findUnique({ where: { username } });
          return user ? prisma : null;
        },
      );

      if (shardPrisma) {
        this.logger.log(`Found user '${username}' in shard '${this.getShardNameFromPrisma(shardPrisma)}'`);
        return shardPrisma;
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

  /**
   * Retrieves the shard name from a PrismaClient instance.
   * @param prisma The PrismaClient instance.
   * @returns The name of the shard.
   */
  private getShardNameFromPrisma(prisma: PrismaClient): string {
    for (const [name, client] of Object.entries(this.shardRouterService.shardClients)) {
      if (client === prisma) {
        return name;
      }
    }
    return 'unknown-shard';
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
}
