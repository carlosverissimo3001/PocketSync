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
import { useUpdateList } from "@/hooks/useList";
import { useState } from "react";
import { useAuthContext } from '../../contexts/AuthContext';

interface ListCardProps {
  list: List;
}

export const ListCardSingle = ({
  list: initialList,
}: ListCardProps) => {
  const [list, setList] = useState(initialList);
  const { mutate: updateList } = useUpdateList();
  const { user } = useAuthContext();
  const createHandler = (item: Partial<ListItemType>) => {
    const newItem: ListItemType = {
      id: uuidv4(),
      name: item.name || "",
      quantity: item.quantity || 1,
      checked: item.checked || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      listId: list.id,
    };
    
    // changes are local to this file
    setList({ ...list, items: [...list.items, newItem] });
  };

  const handleUpdateItem = (action: string, itemId: string) => {
    // only allowed: delete
    if (action === "delete") {
      setList({ ...list, items: list.items.filter((item) => item.id !== itemId) });
    }
  }


  // Send to the server
  const onSaveChanges = () => {
    updateList({ list, userId: user?.id ?? "" });
  }

  return (
    <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold`}>
              {list.name}
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {list.createdAt ? formatDateToMMMDDYYYY(list.createdAt) : "N/A"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.items.length > 0 ? (
          <div className="space-y-2">
            {list.items
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  // no changes allowed other than deleting and creating items
                  updateItem={handleUpdateItem}
                  allowChange={false} 
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
          <AddItemDialog submitHandler={createHandler} />
          <Button 
            variant="green" 
            onClick={onSaveChanges}
          >
            Save Changes
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
