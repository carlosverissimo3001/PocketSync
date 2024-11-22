import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ListsModule } from './lists/lists.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [UsersModule, ListsModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
