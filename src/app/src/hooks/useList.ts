import { useQuery, useMutation } from "@tanstack/react-query";
import { listService } from "@/services/listService";
import { CreateListDto, List } from "@/types/list.types";
import { useSync } from "@/contexts/SyncContext";

export const useList = (id: string) => {
  return useQuery({
    queryKey: ["list", id],
    queryFn: () => listService.getList(id),
    retry: false,
  });
};

export const useFetchLists = (userId: string) => {
  return useMutation({
    mutationKey: ["fetchLists"],
    mutationFn: () => listService.getListsForUser(userId),
  });
};

export const useUpdateList = () => {
  return useMutation({
    mutationKey: ["updateList"],
    mutationFn: ({ list, userId }: { list: List; userId: string }) =>
      listService.updateList(list, userId),
  });
};

export const useCreateList = () => {
  return useMutation({
    mutationKey: ["createList"],
    mutationFn: (data: CreateListDto) => listService.createList(data),
  });
};

export const useSyncLists = () => {
  const { lastSync } = useSync();
  return useMutation({
    mutationKey: ["syncLists"],
    mutationFn: ({ lists, userId }: { lists: List[]; userId: string }) => {
      // If last sync is null, there were never any syncs, so we sync all lists
      const filteredLists = lastSync
        ? lists.filter((list) => list.updatedAt && list.updatedAt > lastSync)
        : lists;
      return listService.syncLists(filteredLists, userId);
    },
  });
};
