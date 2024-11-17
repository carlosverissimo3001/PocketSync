import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from 'src/dtos/create-list.dto';
@Injectable()
export class ListsService {
  constructor(private prisma: PrismaService) {}

  async createList(list: CreateListDto) {
    // TODO: Implement
    return { message: 'List created' };
  }

  async getLists(userId: string) {
    return this.prisma.list.findMany({ where: { ownerId: userId } });
  }

  async getList(id: string) {
    const list = await this.prisma.list.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!list) {
      throw new NotFoundException(`List with ID ${id} not found`);
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: list?.ownerId },
      select: {
        username: true,
      },
    });

    return { ...list, owner };
  }
}
