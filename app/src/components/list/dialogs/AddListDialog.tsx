import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogPortal } from "@radix-ui/react-dialog"
import { Label } from "@radix-ui/react-label"
import { Button } from "../../ui/button"
import { DialogHeader, DialogFooter } from "../../ui/dialog"
import { Input } from "../../ui/input"
import { ListCheck } from "lucide-react"
import { useState } from "react"

interface AddListDialogProps {
  submitHandler: (name: string) => void;
}

export const AddListDialog = ({ submitHandler }: AddListDialogProps) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");

    const onSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (name.trim()) {
            submitHandler(name);
            setOpen(false);
            setName("");
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <ListCheck className="w-2 h-2 mr-1" />
                    Add List
                </Button>
            </DialogTrigger>
            <DialogPortal>
                <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg border shadow-lg sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            <p className="text-xl font-bold">Add List</p>
                        </DialogTitle>
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
                                    className="col-span-3" 
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="destructive" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" color="green">
                                Create
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    )
}