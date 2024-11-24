import { getCurrentDB } from '@/db/db';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

type SyncContextType = {
  lastSync: Date | null;
  updateLastSync: (listLength: number) => Promise<void>;
  fetchLastSync: () => Promise<void>;
};

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const updateLastSync = useCallback(async (listLength: number) => {
    const newSyncTime = new Date();
    await getCurrentDB().serverSyncs.put({
      id: uuidv4(),
      listLength,
      lastSync: newSyncTime
    });
    setLastSync(newSyncTime);
  }, []);

  const fetchLastSync = useCallback(async () => {
    try {
      const lastSyncRecord = await getCurrentDB().serverSyncs.orderBy('lastSync').last();
      setLastSync(lastSyncRecord?.lastSync ?? null);
    } catch (error) {
      console.log('No previous sync found');
      setLastSync(null);
    }
  }, []);

  return (
    <SyncContext.Provider value={{ lastSync, updateLastSync, fetchLastSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};