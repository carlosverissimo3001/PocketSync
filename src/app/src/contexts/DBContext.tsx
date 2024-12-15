import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { initializeDB, ShoppingListDB } from '@/db/db';

type DBContextType = {
  db: ShoppingListDB | null;
  initializeUserDB: (userId: string) => Promise<ShoppingListDB>;
  closeUserDB: () => Promise<void>;
};

const DBContext = createContext<DBContextType | null>(null);

export const DBProvider = ({ children }: { children: ReactNode }) => {
  const [db, setDb] = useState<ShoppingListDB | null>(null);

  const initializeUserDB = useCallback(async (userId: string) => {
    const database = initializeDB(userId);
    setDb(database);
    return database;
  }, []);

  const closeUserDB = async () => {
    if (db) {
      try {
        await db.close();
        setDb(null);
        await db.delete();
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  };

  return (
    <DBContext.Provider value={{ db, initializeUserDB, closeUserDB }}>
      {children}
    </DBContext.Provider>
  );
};

export const useDB = () => {
  const context = useContext(DBContext);
  if (!context) {
    throw new Error('useDB must be used within a DBProvider');
  }
  return context;
};
