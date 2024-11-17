import { useQuery } from "@tanstack/react-query";
import { listService } from "@/services/listService";

export const useList = (id: string) => {
    return useQuery({
        queryKey: ["list", id],
        queryFn: () => listService.getList(id),
        retry: false,
    });
};

export const useLists = () => {
    return useQuery({
        queryKey: ["lists"],
        queryFn: () => listService.getLists(),
        retry: false,
    });
};
