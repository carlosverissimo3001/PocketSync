// src/users/users.service.ts

import {
  Injectable,
  Inject,
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
          60 * 60 * 1000, // 1 hour in milliseconds
        );

        const token = this.generateJwt(user);
        return { user: this.omitPassword(user), token, isValid: true };
      } else {
        throw new NotFoundException('User does not exist');
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

  async register(data: CreateUserDto) {
    const { username, password } = data;

    // Checks if any of the shards have the user by username
    const userShard = await this.getShardForUsername(username);

    // Already exists, throw
    if (userShard) {
      throw new ConflictException(
        'User already exists. If this is your account, please login instead.',
      );
    }

    // Let's create

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuid();

    // Note: We determine the shard based on the userId
    const shard = this.shardRouterService.getShardForUser(userId);
    const shardPrisma = this.shardRouterService.getPrismaClient(shard.name);

    // Create the user
    const user = await shardPrisma.user.create({
      data: {
        id: userId,
        username,
        password: hashedPassword,
      },
    });

    this.logger.log(
      `Created new user '${user.username}' with ID '${user.id}' in shard '${shard.name}'`,
    );

    // don't generate token yet, the login will do that
    return { success: true, message: 'User created successfully' };
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
      const shards = await this.shardRouterService.getAllShardClients();
      for (const shard of shards) {
        const user = await shard.user.findUnique({ where: { username } });
        if (user) {
          this.logger.log(`Found user '${username}' in shard '${shard}'`);
          return shard;
        }
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
