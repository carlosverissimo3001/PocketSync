import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ListItem as ListItemType } from "@/types/list.types";

export const ListItem = ({ item, updateItem }: { item: ListItemType, updateItem: (action: string, itemId: string) => void }) => {
    const handleCheck = (checked: boolean) => {
        updateItem(checked ? "toggleChecked" : "toggleUnchecked", item.id);
    };

    return (
        <div 
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-2"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Checkbox id={item.id} checked={item.checked} onCheckedChange={handleCheck}/>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.quantity !== 1 && (
                        <>
                            <span className={`text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ${item.checked ? 'line-through' : ''}`}>
                                {item.quantity}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">•</span>
                        </>
                    )}
                    <span className={`font-medium text-gray-800 dark:text-gray-200 truncate ${item.checked ? 'line-through' : ''}`}>
                        {item.name}
                    </span>
                </div>
            </div>

            <div 
                className={`flex items-center justify-end gap-1 border-l ${item.quantity !== 1 ? "border-gray-200 dark:border-gray-600" : "border-transparent"} pl-4`}
            >
                <div className="flex gap-1">
                    <Button 
                        variant="outline"   
                        size="icon" 
                        onClick={() => updateItem("incrementQuantity", item.id)}
                        className="hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </Button>
                    {item.quantity !== 1 && (
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => updateItem("decrementQuantity", item.id)}
                            className="hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            <MinusIcon className="w-4 h-4" />
                        </Button>
                    )}
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => updateItem("delete", item.id)}
                    className="ml-2 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                >
                    <TrashIcon className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};
