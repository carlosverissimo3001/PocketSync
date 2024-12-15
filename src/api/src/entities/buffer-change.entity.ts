import { List } from './list.entity';

export class BufferedChange {
  id: string;
  userId: string;
  listId: string;
  changes: List;
  timestamp: Date;
  resolved: boolean;
}
