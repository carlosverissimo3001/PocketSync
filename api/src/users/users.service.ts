import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserEntity } from 'src/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ShardRouterService } from '@/sharding/shardRouter.service';

@Injectable()
export class UsersService {
  constructor(
    private jwtService: JwtService,
    private shardRouterService: ShardRouterService,
  ) {}

  async login(username: string, password: string) {
    // Shard by username for user lookups
    const prisma = await this.shardRouterService.getShardClientForKey(username);

    let user = await prisma.user.findUnique({ where: { username } });

    // If user does not exist, create them
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
        },
      });
    } else {
      // If user exists, check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return null; // Invalid password
    }

    // Generate JWT token
    const token = this.generateJwt(user);
    return { user: this.omitPassword(user), token, isValid: true };
  }

  private omitPassword(user: any) {
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
    // If we’re looking up by id, use id as the shard key
    const prisma = await this.shardRouterService.getShardClientForKey(id);
    return prisma.user.findUnique({ where: { id } });
  }

  async verifyToken(token: string) {
    const payload = this.jwtService.verify(token);

    // Shard by userId for token verification since we have the id from the token
    const prisma = await this.shardRouterService.getShardClientForKey(payload.id);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });

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
}
