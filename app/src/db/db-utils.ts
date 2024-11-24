import { List } from "@/types/list.types";
import { getCurrentDB } from "./db";

export const fetchListsWithItems = async () => {
  try {
    const db = getCurrentDB();
    const lists = await db.lists.toArray();
    const listsWithItems = await Promise.all(
      lists.map(async (list) => {
        const items = await db.items.where("listId").equals(list.id).toArray();
        return { ...list, items };
      })
    );
    return listsWithItems;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not initialized')) {
      return [];  // Return empty array if DB isn't ready yet
    }
    throw error;  // Re-throw other errors
  }
};

export const createList = async (list: List) => {
  const db = getCurrentDB();
  await db.lists.add(list);
};

export const updateList = async (list: List) => {
  const db = getCurrentDB();
  await db.transaction('rw', db.lists, db.items, async () => {
    const { items, ...listWithoutItems } = list;
    
    await db.items.where('listId').equals(list.id).delete();
    await db.lists.put(listWithoutItems);
    
    if (items?.length) {
      await Promise.all(
        items.map(item => db.items.put(item))
      );
    }
  });
};

export const deleteList = async (listId: string) => {
  const db = getCurrentDB();
  await db.transaction("rw", db.lists, db.items, async () => {
    await db.items.where("listId").equals(listId).delete();
    await db.lists.delete(listId);
  });
};

export const getLastSync = async () => {
  const db = getCurrentDB();
  return db.serverSyncs.orderBy("lastSync").last();
};
