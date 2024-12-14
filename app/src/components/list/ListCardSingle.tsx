import { List, ListItem as ListItemType } from "@/types/list.types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { formatDateToMMMDDYYYY } from "@/utils/date";
import { ListItem } from "./ListItem";
import { AddItemDialog } from "./dialogs/AddItemDialog";
import { v4 as uuidv4 } from "uuid";
import { useUpdateList } from "@/hooks/useList";
import { useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { TOAST_MESSAGES } from "@/utils/toast-messages";
import { Input } from "../ui/input";
interface ListCardProps {
  list: List;
}

export const ListCardSingle = ({ list: initialList }: ListCardProps) => {
  const [list, setList] = useState(initialList);
  const { mutate: updateList } = useUpdateList();
  const { user } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(list.name);

  const saveToServer = (updatedList: List) => {
    updateList(
      { list: updatedList, userId: user?.id ?? "" },
      {
        onError: () => {
          toast(TOAST_MESSAGES.SYNC_ERROR);
        },
      }
    );
  };

  const createHandler = (item: Partial<ListItemType>) => {
    const newItem: ListItemType = {
      id: uuidv4(),
      name: item.name || "",
      quantity: item.quantity || 1,
      checked: item.checked || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      listId: list.id,
      lastEditorUsername: user?.username ?? "",
    };

    const updatedList = {
      ...list,
      lastEditorUsername: user?.username ?? "",
      items: [...list.items, newItem],
    };
    setList(updatedList);
    saveToServer(updatedList);
  };

  const allCompleted =
    list.items.filter((item) => !item.deleted).every((item) => item.checked) &&
    list.items.filter((item) => !item.deleted).length > 0;

  const handleUpdateItem = (
    action: string,
    itemId: string,
    newName?: string
  ) => {
    let updatedItems = [...list.items];

    switch (action) {
      case "delete":
        updatedItems = list.items.map((item) =>
          item.id === itemId
            ? { ...item, deleted: true, deletedAt: new Date() }
            : item
        );
        break;
      case "toggleChecked":
        updatedItems = list.items.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        break;
      case "toggleUnchecked":
        updatedItems = list.items.map((item) =>
          item.id === itemId ? { ...item, checked: false } : item
        );
        break;
      case "updateName":
        updatedItems = list.items.map((item) =>
          item.id === itemId ? { ...item, name: newName || item.name } : item
        );
        break;
      case "incrementQuantity":
        updatedItems = list.items.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
        );
        break;
      case "decrementQuantity":
        updatedItems = list.items.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
        );
        break;
      default:
        break;
    }

    const updatedList = {
      ...list,
      lastEditorUsername: user?.username ?? "",
      items: updatedItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              lastEditorUsername: user?.username ?? "",
              updatedAt: new Date(),
            }
          : item
      ),
    };

    setList(updatedList);
    saveToServer(updatedList);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(list.id);
      toast(TOAST_MESSAGES.COPY_SUCCESS);
    } catch (err) {
      toast(TOAST_MESSAGES.COPY_FAILED);
    }
  };

  const editNameHandler = (newName: string) => {
    const updatedList = { 
      ...list, 
      name: newName, 
      updatedAt: new Date(), 
      lastEditorUsername: user?.username ?? "" 
    };
    setList(updatedList);
    saveToServer(updatedList);
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
              .filter((item) => !item.deleted)
              .map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  updateItem={handleUpdateItem}
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
        <AddItemDialog submitHandler={createHandler} />
      </CardFooter>
    </Card>
  );
};
