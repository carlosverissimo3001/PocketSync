import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogPortal,
} from "@radix-ui/react-dialog";
import { Label } from "@radix-ui/react-label";
import { Button } from "../../ui/button";
import { DialogHeader, DialogFooter } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "../../ui/checkbox";
import { ListItem } from "@/types/list.types";

interface AddItemDialogProps {
  submitHandler: (item: Partial<ListItem>) => void;
}

export const AddItemDialog = ({ submitHandler }: AddItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [checked, setChecked] = useState(false);

  const onSubmit = () => {
    const item: Partial<ListItem> = {
      name,
      quantity: quantity,
      checked: checked,
    };
    submitHandler(item);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="w-2 h-2 mr-1" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg border shadow-lg sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              <p className="text-xl font-bold">Add Item</p>
            </DialogTitle>
            <DialogDescription>
              Create a new item for your list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <div className="flex items-center justify-start gap-2 col-span-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <PlusIcon className="w-4 h-4" />
                </Button>
                <span className="min-w-8 text-center">{quantity}</span>
                {quantity !== 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity - 1)}
                    className="hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="checked" className="text-right">
                Already Bought?
              </Label>
              <div className="col-span-3">
                <Checkbox
                  id="checked"
                  checked={checked}
                  onCheckedChange={(checked) => setChecked(checked as boolean)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} color="green">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
