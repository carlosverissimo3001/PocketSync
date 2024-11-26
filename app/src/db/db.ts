import Dexie, { Table } from "dexie";
import { List, ListItem } from "@/types/list.types";

type ListWithoutItems = Omit<List, 'items'>;

export class ShoppingListDB extends Dexie {
  lists!: Table<ListWithoutItems>; 
  items!: Table<ListItem>; 
  serverSyncs!: Table<{
    id: string;
    listLength: number;
    lastSync: Date;
  }>;

  constructor(userId: string) {
    super(`ShoppingListDB_${userId}`);
    this.version(1).stores({
      lists: "id, name, ownerId, createdAt, updatedAt, deleted, deletedAt",
      items: "id, listId, name, quantity, checked, createdAt, updatedAt, deleted, deletedAt",
      serverSyncs: "id, lastSync, listLength",
    });
  }
}

let currentDB: ShoppingListDB | null = null;

export const initializeDB = (userId: string) => {
  currentDB = new ShoppingListDB(userId);
  return currentDB;
};

export const closeDB = async () => {
  if (currentDB) {
    await currentDB.close();
    currentDB = null;
  }
};

export const getCurrentDB = () => {
  if (!currentDB) {
    throw new Error('Database not initialized. Call initializeDB first.');
  }
  return currentDB;
};

// Export everything needed
export type { ListWithoutItems };
