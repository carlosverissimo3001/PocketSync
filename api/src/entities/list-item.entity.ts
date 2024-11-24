import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
export class ListItem {
  id: string;
  name: string;
  quantity: number;
  checked: boolean;
  createdAt: Date;
  updatedAt: Date;
  listId: string;
}

export const buildSampleItem = (): Omit<
  Prisma.ListItemCreateInput,
  'list'
> => ({
  id: uuidv4(),
  name: 'Item',
  quantity: 13,
  checked: false,
  createdAt: new Date('2023-11-16'),
  updatedAt: new Date('2023-11-16'),
});
