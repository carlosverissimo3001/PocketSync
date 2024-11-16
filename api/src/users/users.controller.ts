import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from 'src/dtos/create-user.dto';

@Controller('login')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async login(@Body() body: CreateUserDto) {
    return this.usersService.login(body.username, body.password);
  }

  @Post('verify-token')
  @HttpCode(200)
  verifyToken(@Body('token') token: string) {
    return this.usersService.verifyToken(token);
  }
}
