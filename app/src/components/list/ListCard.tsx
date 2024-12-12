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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Copy, Info } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useAuthContext } from "@/contexts/AuthContext";
import { TOAST_MESSAGES } from "@/utils/toast-messages";
interface ListCardProps {
  list: List;
  updateList: (list: List) => void;
  handleDelete: (list: List) => void;
}

export const ListCard = ({ list, updateList, handleDelete }: ListCardProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(list.name);
  const { user } = useAuthContext();
  const allCompleted =
    list.items?.length > 0 &&
    list.items.filter((item) => !item.deleted).every((item) => item.checked) &&
    list.items.filter((item) => !item.deleted).length > 0;

  const createItemHandler = (item: Partial<ListItemType>) => {
    const newItem: ListItemType = {
      id: uuidv4(),
      name: item.name || "",
      quantity: item.quantity || 1,
      checked: item.checked || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      listId: list.id,
      lastEditorId: user?.id ?? "",
    };
    const updatedItems = [...list.items, newItem];

    updateList({
      ...list,
      items: updatedItems,
      updatedAt: new Date(),
      lastEditorId: user?.id ?? "",
    });
  };

  const updateItem = (action: string, itemId: string, newName?: string) => {
    const updatedItems = list.items
      .map((item) => {
        if (item.id !== itemId) return item;

        // Update the item metadata
        const updatedItem = {
          ...item,
          updatedAt: new Date(),
          lastEditorId: user?.id ?? "",
        };

        switch (action) {
          case "toggleChecked":
            return { ...updatedItem, checked: !item.checked };
          case "toggleUnchecked":
            return { ...updatedItem, checked: false };
          case "delete":
            return { ...updatedItem, deleted: true, deletedAt: new Date() };
          case "incrementQuantity":
            return { ...updatedItem, quantity: item.quantity + 1 };
          case "decrementQuantity":
            return { ...updatedItem, quantity: item.quantity - 1 };
          case "updateName":
            return { ...updatedItem, name: newName || item.name };
          default:
            return updatedItem;
        }
      })
      .filter(Boolean) as ListItemType[];

    // We can also consider that the list has been updated
    updateList({
      ...list,
      items: updatedItems,
      updatedAt: new Date(),
      lastEditorId: user?.id ?? "",
    });
  };

  const editNameHandler = (newName: string) => {
    updateList({ ...list, name: newName, updatedAt: new Date(), lastEditorId: user?.id ?? "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editNameHandler(editedName);
    setIsEditing(false);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(list.id);
      toast(TOAST_MESSAGES.COPY_SUCCESS);
    } catch (err) {
      toast(TOAST_MESSAGES.COPY_FAILED);
    }
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
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`text-xl font-bold ${
                          allCompleted ? "line-through text-gray-500" : ""
                        } ${"cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"}`}
                        onClick={() => setIsEditing(true)}
                      >
                        {list.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Rename list</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Copy
                        className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={handleShare}
                      />
                    </TooltipTrigger>
                    <TooltipContent>Share list</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {list.createdAt ? formatDateToMMMDDYYYY(list.createdAt) : "N/A"}
            </span>
            {list.lastEditorId && list.lastEditorId !== user?.id && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-blue-500" />
                  </TooltipTrigger>
                  <TooltipContent>Last edited by another user</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.items.length > 0 ? (
          <div className="space-y-2">
            {list.items
              .sort((a, b) => a.name.localeCompare(b.name))
              .filter((item) => !item.deleted)
              .map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  updateItem={updateItem}
                  allowChange={true}
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
          <AddItemDialog submitHandler={createItemHandler} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete List</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  list "{list.name}" and all its items.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(list)}
                  className="bg-destructive hover:bg-destructive/90 text-black dark:text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
};
