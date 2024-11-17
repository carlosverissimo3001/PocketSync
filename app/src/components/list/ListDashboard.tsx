import { List } from "@/types/list.types";
import { ListCard } from "./ListCard";

export const ListDashboard = ({ 
    initialLists: lists, 
    onUpdateList,
    onDeleteList
}: { 
    initialLists: List[]
    onUpdateList: (list: List) => void
    onDeleteList: (listId: string) => void
}) => {  

    return (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">            
            {lists?.map((list) => (
                <div key={list.id} className="break-inside-avoid mb-6 hover:scale-102 transition-transform">
                    <ListCard 
                        list={list} 
                        updateList={onUpdateList}
                        handleDelete={onDeleteList}
                        isOwner={true}
                    />
                </div>
            ))}
        </div>
    );
};
    