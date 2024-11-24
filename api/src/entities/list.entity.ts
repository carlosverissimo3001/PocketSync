import { Prisma } from '@prisma/client';
import { buildSampleItem, ListItem } from './list-item.entity';
import { v4 as uuidv4 } from 'uuid';
export class List {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  items: ListItem[];
  updatedAt: Date;
}

export const buildSampleList = (userId: string): Prisma.ListCreateInput => ({
  id: uuidv4(),
  name: 'Created with ❤️ by the server',
  owner: { connect: { id: userId } },
  items: { create: [buildSampleItem()] },
  createdAt: new Date('2023-11-16'), // Don't ask me why I chose this date.
  updatedAt: new Date('2023-11-16'),
});
