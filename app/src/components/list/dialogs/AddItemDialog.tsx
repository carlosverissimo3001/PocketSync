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
import { ListItem } from "@/types/list.types";
import { Switch } from "@/components/ui/switch";

interface AddItemDialogProps {
  submitHandler: (item: Partial<ListItem>) => void;
}

export const AddItemDialog = ({ submitHandler }: AddItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [checked, setChecked] = useState(false);

  const clearState = () => {
    setName("");
    setQuantity(1);
    setChecked(false);
  };

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const item: Partial<ListItem> = {
      name,
      quantity: quantity,
      checked: checked,
    };

    if (name.length > 0) {
      submitHandler(item);
      clearState();
      setOpen(false);
    }
  };

  //v1
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
          <form onSubmit={onSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3 bg-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <div className="flex items-center justify-center gap-2 col-span-3">
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <PlusIcon className="w-4 h-4" />
                </Button>
                <span className="min-w-8 text-center">{quantity}</span>
                  <Button
                    disabled={quantity === 1}
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => setQuantity(quantity - 1)}
                    className="hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                  <MinusIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="checked" className="text-right">
                Checked?
              </Label>
              <div className="col-span-3">
                <Switch
                  id="checked"
                  checked={checked}
                  onCheckedChange={(checked) => setChecked(checked as boolean)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => setOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit">
              Add
            </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
