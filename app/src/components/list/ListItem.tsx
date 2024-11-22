import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ListItem as ListItemType } from "@/types/list.types";
import { useState } from "react";
import { Input } from "../ui/input";

type ListItemProps = {
  item: ListItemType;
  updateItem: (action: string, itemId: string, newValue?: string) => void;
  allowChange: boolean;
};

export const ListItem = ({ item, updateItem, allowChange }: ListItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);

  const handleCheck = (checked: boolean) => {
    updateItem(checked ? "toggleChecked" : "toggleUnchecked", item.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateItem("updateName", item.id, editedName);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-md bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-1">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {allowChange && ( 
          <Checkbox
            id={item.id}
            checked={item.checked}
            onCheckedChange={handleCheck}
            className="h-4 w-4"
          />
        )}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {item.quantity !== 1 && (
            <>
              <span
                className={`text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ${
                  item.checked ? "line-through" : ""
                }`}
              >
                {item.quantity}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                •
              </span>
            </>
          )}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-6 text-sm"
                autoFocus
                onBlur={handleSubmit}
              />
            </form>
          ) : (
            <span className={`text-sm font-medium text-gray-800 dark:text-gray-200 truncate ${item.checked ? "line-through" : ""}`}>
              {item.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        {allowChange && (
          <>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => updateItem("incrementQuantity", item.id)}
                className="h-7 w-7"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </Button>
              {item.quantity !== 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateItem("decrementQuantity", item.id)}
                  className="h-7 w-7"
                >
                  <MinusIcon className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateItem("delete", item.id)}
              className="h-7 w-7 ml-1"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
