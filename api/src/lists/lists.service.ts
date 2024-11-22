import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from 'src/dtos/create-list.dto';
import { List } from 'src/entities/list.entity';
@Injectable()
export class ListsService {
  constructor(private prisma: PrismaService) {}

  async listHandler(lists: List[]) {
    // TODO: Implement
    // Logic: The many frontends, from time to time, will send a batch of lists to be created/updated.
    // Make sure to handle conflicts between different frontends.
    // We will handle it using CRDTs.
    // Both lists and items have a createdAt and updatedAt timestamp.
    // We can implement a LWW (Last Writer Wins) strategy to handle conflicts.
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
