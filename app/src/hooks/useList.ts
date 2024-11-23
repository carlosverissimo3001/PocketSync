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

export const useSyncLists = () => {
    const { updateLastSync } = useSync();

    return useMutation({
        mutationKey: ["syncLists"],
        mutationFn: (lists: List[]) => listService.syncLists(lists),
        onSuccess: async (_, lists) => {
            await updateLastSync(lists.length);
        },
    });
};
