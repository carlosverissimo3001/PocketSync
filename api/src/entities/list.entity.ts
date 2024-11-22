import { ListItem } from './list-item.entity';

export class List {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  items: ListItem[];
  updatedAt: Date;
}
