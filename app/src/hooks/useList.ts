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

export const useSyncLists = (lists: List[]) => {
    return useMutation({
        mutationKey: ["syncLists"],
        mutationFn: (lists: List[]) => listService.syncLists(lists),
    });
};
