import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserEntity } from 'src/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  async login(username: string, password: string) {
    let user = await this.prisma.user.findUnique({ where: { username } });

    // If user does not exist, create them
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await this.prisma.user.create({
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
    return this.prisma.user.findUnique({ where: { id } });
  }

  async verifyToken(token: string) {
    const payload = this.jwtService.verify(token);
    const user = await this.findUserById(payload.id);

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
