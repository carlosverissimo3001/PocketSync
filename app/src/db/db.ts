import { List, ListItem } from "@/types/list.types";
import Dexie, { Table } from "dexie";

type ListWithoutItems = Omit<List, 'items'>;

class ShoppingListDB extends Dexie {
  lists!: Table<ListWithoutItems>; 
  items!: Table<ListItem>; 
  serverSyncs!: Table<{
    id: string;
    listLength: number; // number of lists synced
    lastSync: Date; // last sync date
  }>;

  constructor() {
    super("ShoppingListDB");
    this.version(1).stores({
      lists: "id, name, ownerId, createdAt, updatedAt",
      items: "id, listId, name, quantity, checked, createdAt, updatedAt",
      serverSyncs: "id, lastSync, listLength",
    });
  }
}

const db = new ShoppingListDB();
export default db;
