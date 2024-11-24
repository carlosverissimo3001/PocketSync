import { useEffect, useState } from 'react';
import { getCurrentDB, initializeDB, closeDB } from '@/db/db';
import { ShoppingListDB } from '@/db/db';
    
export const useDB = (userId: string | null) => {
  const [db, setDb] = useState<ShoppingListDB | null>(null);

  useEffect(() => {
    if (userId) {
      const database = initializeDB(userId);
      setDb(database);
    } else {
      closeDB();
      setDb(null);
    }
  }, [userId]);

  return db;
}; 