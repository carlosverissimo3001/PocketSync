import { List, ListItem } from "@/types/list.types";
import Dexie, { Table } from "dexie";

type ListWithoutItems = Omit<List, 'items'>;

class ShoppingListDB extends Dexie {
  lists!: Table<ListWithoutItems>; 
  items!: Table<ListItem>; 

  constructor() {
    super("ShoppingListDB");
    this.version(1).stores({
      lists: "id, name, ownerId, createdAt",
      items: "id, listId, name, quantity, checked, createdAt",
    });
  }
}

const db = new ShoppingListDB();
export default db;
