import api from '../api/axios';
import { List, ListExtended } from '../types/list.types';

export const listService = {
  getLists: async (): Promise<List[]> => {
    const { data } = await api.get<List[]>('/lists');
    return data;
  },

  getList: async (id: string): Promise<ListExtended> => {
    const { data } = await api.get<ListExtended>(`/lists/${id}`);
    return data;
  },

  syncLists: async (lists: List[], userId: string): Promise<void> => {
    // Won't return anything,
    // The BE will handle the conflicts
    // and then use ZMQ to notify the client using PUB/SUB
    await api.post('/lists/', { lists, userId });
  },

  updateList: async (list: List, userId: string): Promise<void> => {
    await api.put(`/lists/update`, { lists: [list], userId });
  },
};      
