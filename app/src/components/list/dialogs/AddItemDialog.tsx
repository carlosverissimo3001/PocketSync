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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-full">
          <PlusIcon className="w-4 h-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.3)] w-[90vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 mb-8">
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Add Item
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-300">
              Create a new item for your list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium block">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 transition-all duration-200"
                  placeholder="Enter item name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium block">
                  Quantity
                </Label>
                <div className="flex items-center gap-2 h-11">
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => setQuantity(quantity - 1)}
                    disabled={quantity === 1}
                    className="h-9 w-9 rounded-full border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-lg font-semibold">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-9 w-9 rounded-full border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="checked" className="text-sm font-medium">
                  Mark as completed
                </Label>
                <Switch
                  id="checked"
                  checked={checked}
                  onCheckedChange={(checked) => setChecked(checked as boolean)}
                  className="bg-zinc-700 dark:bg-zinc-600 data-[state=checked]:bg-indigo-600 dark:data-[state=checked]:bg-indigo-400"
                />
              </div>
            </div>
            <DialogFooter className="flex-col gap-3 sm:flex-row pt-6 border-t border-zinc-200/50 dark:border-zinc-700/50">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                type="button"
                className="w-full sm:w-auto rounded-full border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                Add Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
