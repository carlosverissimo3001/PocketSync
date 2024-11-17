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
};      