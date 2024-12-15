import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from 'src/dtos/create-user.dto';

@Controller('login')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @HttpCode(200)
  async login(@Body() body: CreateUserDto) {
    try {
      const result = await this.usersService.login(
        body.username,
        body.password,
      );
      if (!result) {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Invalid username or password',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('verify-token')
  @HttpCode(200)
  verifyToken(@Body('token') token: string) {
    return this.usersService.verifyToken(token);
  }
}
