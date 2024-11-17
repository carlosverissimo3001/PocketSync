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

interface ListCardProps {
  list: List;
  updateList: (updatedList: List) => void;
  handleDelete: (listId: string) => void;
  isOwner: boolean;
}

export const ListCard = ({ list, updateList, handleDelete, isOwner }: ListCardProps) => {
  const allCompleted = list.items.every((item) => item.checked) && list.items.length > 0; 
  const createHandler = (item: Partial<ListItemType>) => {
    const newItem: ListItemType = {
      id: item.id || uuidv4(),
      name: item.name || "",
      quantity: item.quantity || 1,
      checked: item.checked || false,
      createdAt: new Date(),
      listId: list.id,
    };
    const updatedItems = [...list.items, newItem];

    updateList({ ...list, items: updatedItems });
  };

  const updateItem = (action: string, itemId: string) => {
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
            if (item.quantity === 1) {
              return null;
            }
            return { ...item, quantity: item.quantity - 1 };
          default:
            return item;
        }
      })
      .filter(Boolean) as ListItemType[];

    updateList({ ...list, items: updatedItems });
  };

  return (
    <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span
            className={`text-xl font-bold ${
              allCompleted ? "line-through text-gray-500" : ""
            }`}
          >
            {list.name}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {list.createdAt ? formatDateToMMMDDYYYY(list.createdAt) : "N/A"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.items.length > 0 ? (
          <div className="space-y-2">
            {list.items.map((item) => (
              <ListItem key={item.id} item={item} updateItem={updateItem} />
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
          {isOwner && (
            <>
              <AddItemDialog submitHandler={createHandler} />
              <Button variant="destructive" onClick={() => handleDelete(list.id)}>
                Delete List
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
