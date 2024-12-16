import { List } from "@/types/list.types";
import { getCurrentDB } from "./db";
import { v4 as uuidv4 } from "uuid";

export const fetchListsWithItems = async () => {
  const db = getCurrentDB();
  const lists = await db.lists.toArray();
  const listsWithItems = await Promise.all(
    lists.map(async (list) => ({
      ...list,
      items: await db.items.where("listId").equals(list.id).toArray(),
    }))
  );
  return listsWithItems;
};

export const setNewSync = async (lastSync: Date) => {
  const db = getCurrentDB();
  await db.serverSyncs.add({
    id: uuidv4(),
    lastSync,
    listLength: 0,
  });
};

export const createList = async (list: List) => {
  const db = getCurrentDB();
  await db.lists.add(list);
};

export const updateList = async (list: List) => {
  const db = getCurrentDB();
  await db.transaction("rw", db.lists, db.items, async () => {
    const { items, ...listWithoutItems } = list;

    await db.items.where("listId").equals(list.id).delete();
    await db.lists.put(listWithoutItems);

    if (items?.length) {
      await Promise.all(items.map((item) => db.items.put(item)));
    }
  });
};

export const deleteList = async (listId: string) => {
  const db = getCurrentDB();
  await db.transaction("rw", db.lists, db.items, async () => {
    await db.items
      .where("listId")
      .equals(listId)
      .modify({ deleted: true, updatedAt: new Date() });

    await db.lists
      .where("id")
      .equals(listId)
      .modify({ deleted: true, updatedAt: new Date() });
  });
};

export const getLastSync = async () => {
  const db = getCurrentDB();
  return db.serverSyncs.orderBy("lastSync").last();
};

export const handleListInsertions = async (
  receivedLists: List[],
  updateLastSync: (length: number) => Promise<void>
) => {
  const db = getCurrentDB();
  if (receivedLists.length !== 0) {
    await db.transaction(
      "rw",
      [db.lists, db.items, db.serverSyncs],
      async () => {
        // TODO: Find a way to make this more efficient
        await db.lists.clear();

        for (const list of receivedLists) {
          await createList(list);

          if (list.items?.length) {
            await Promise.all(list.items.map((item) => db.items.put(item)));
          }
        }

        await db.serverSyncs.put({
          id: uuidv4(),
          listLength: receivedLists.length,
          lastSync: new Date(),
        });
      }
    );
  }
  await updateLastSync(receivedLists.length);
};
