import { List, ListItem as ListItemType } from "@/types/list.types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { formatDateToMMMDDYYYY } from "@/utils/date";
import { ListItem } from "./ListItem";
import { AddItemDialog } from "./dialogs/AddItemDialog";
import { v4 as uuidv4 } from "uuid";
import { useState } from "react";
import { Input } from "../ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface ListCardProps {
  list: List;
  updateList: (list: List) => void;
  handleDelete: (list: List) => void;
  isFromSingleView: boolean;
}

export const ListCard = ({
  list,
  updateList,
  handleDelete,
  isFromSingleView,
}: ListCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(list.name);
  const allCompleted =
    list.items.every((item) => item.checked) && list.items.length > 0;

  const createHandler = (item: Partial<ListItemType>) => {
    const newItem: ListItemType = {
      id: uuidv4(),
      name: item.name || "",
      quantity: item.quantity || 1,
      checked: item.checked || false,
      createdAt: new Date(),
      listId: list.id,
    };
    const updatedItems = [...list.items, newItem];

    updateList({ ...list, items: updatedItems });
  };

  const updateItem = (action: string, itemId: string, newName?: string) => {
    const updatedItems = list.items
      .map((item) => {
        if (item.id !== itemId) return item;

        switch (action) {
          case "toggleChecked":
            return { ...item, checked: !item.checked };
          case "toggleUnchecked":
            return { ...item, checked: false };
          case "delete":
            return null;
          case "incrementQuantity":
            return { ...item, quantity: item.quantity + 1 };
          case "decrementQuantity":
            return { ...item, quantity: item.quantity - 1 };
          case "updateName":
            return { ...item, name: newName || item.name };
          default:
            return item;
        }
      })
      .filter(Boolean) as ListItemType[];
    updateList({ ...list, items: updatedItems });
  };

  const editNameHandler = (newName: string) => {
    updateList({ ...list, name: newName });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editNameHandler(editedName);
    setIsEditing(false);
  };

  return (
    <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="max-w-[200px]"
                  autoFocus
                  onBlur={handleSubmit}
                />
              </form>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`text-xl font-bold ${
                        allCompleted ? "line-through text-gray-500" : ""
                      } ${
                        !isFromSingleView
                          ? "cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                          : ""
                      }`}
                      onClick={() => !isFromSingleView && setIsEditing(true)}
                    >
                      {list.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Rename list</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {list.createdAt ? formatDateToMMMDDYYYY(list.createdAt) : "N/A"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.items.length > 0 ? (
          <div className="space-y-2">
            {list.items.map((item) => (
              <ListItem
                key={item.id}
                item={item}
                updateItem={updateItem}
                allowChange={!isFromSingleView}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center italic">
            No items in this list
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="flex gap-2">
          {!isFromSingleView && (
            <>
              <AddItemDialog submitHandler={createHandler} />
              <Button variant="destructive" onClick={() => handleDelete(list)}>
                Delete List
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
