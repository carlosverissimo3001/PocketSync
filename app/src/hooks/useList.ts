import { useQuery, useMutation } from "@tanstack/react-query";
import { listService } from "@/services/listService";
import { List } from "@/types/list.types";

export const useList = (id: string) => {
    return useQuery({
        queryKey: ["list", id],
        queryFn: () => listService.getList(id),
        retry: false,
    });
};

export const useLists = (userId: string) => {
    return useQuery({
        queryKey: ["lists", userId],
        queryFn: async () => {
            return listService.getLists(userId);
        },
        retry: false,
        enabled: !!userId
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
    return useMutation({
        mutationKey: ["syncLists"],
        mutationFn: ({ lists, userId }: { lists: List[], userId: string }) => 
            listService.syncLists(lists, userId),
    });
};
