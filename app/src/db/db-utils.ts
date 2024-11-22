import { List } from "@/types/list.types";
import db from "./db";

export const fetchListsWithItems = async () => {
  const lists = await db.lists.toArray();
  const listsWithItems = await Promise.all(
    lists.map(async (list) => {
      const items = await db.items.where("listId").equals(list.id).toArray();
      return { ...list, items }; // Combine list and its items
    })
  );
  return listsWithItems;
};

export const createList = async (list: List) => {
  await db.lists.add(list);
};

export const updateList = async (list: List) => {
  await db.transaction('rw', db.lists, db.items, async () => {
    const { items, ...listWithoutItems } = list;
    
    // First, delete all existing items for this list
    await db.items.where('listId').equals(list.id).delete();

    // Update the list without the items
    await db.lists.put(listWithoutItems);
    
    // Add the new items (if any)
    if (items?.length) {
      await Promise.all(
        items.map(item => db.items.put(item))
      );
    }
  });
};

export const deleteList = async (listId: string) => {
  await db.transaction("rw", db.lists, db.items, async () => {
    // Delete all items for this list
    await db.items.where("listId").equals(listId).delete();
    // Delete the list
    await db.lists.delete(listId);
  });
};