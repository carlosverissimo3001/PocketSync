import { useQuery, useMutation } from "@tanstack/react-query";
import { listService } from "@/services/listService";
import { List } from "@/types/list.types";
import { useSync } from "@/contexts/SyncContext";

export const useList = (id: string) => {
    return useQuery({
        queryKey: ["list", id],
        queryFn: () => listService.getList(id),
        retry: false,
    });
};

export const useUpdateList = () => {
    return useMutation({
        mutationKey: ["updateList"],
        mutationFn: ({ list, userId }: { list: List, userId: string }) => 
            listService.updateList(list, userId),
    });
};

export const useSyncLists = () => {
    const { updateLastSync } = useSync();

    return useMutation({
        mutationKey: ["syncLists"],
        mutationFn: ({ lists, userId }: { lists: List[], userId: string }) => 
            listService.syncLists(lists, userId),
        onSuccess: async (_, { lists }) => {
            await updateLastSync(lists.length);
        },
    });
};
