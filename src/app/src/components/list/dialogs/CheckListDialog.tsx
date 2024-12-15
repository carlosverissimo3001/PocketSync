import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogPortal } from "@radix-ui/react-dialog"
import { Label } from "@radix-ui/react-label"
import { Button } from "../../ui/button"
import { DialogHeader, DialogFooter } from "../../ui/dialog"
import { Input } from "../../ui/input"
import { EyeIcon, ListCheck } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

interface CheckListDialogProps {
  className?: string;
}

export const CheckListDialog = ({ className }: CheckListDialogProps) => {
    const [open, setOpen] = useState(false);
    const [listId, setListId] = useState("");
    const navigate = useNavigate();

    const onSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (listId.trim()) {
            setOpen(false);
            setListId("");
        }

        navigate(`/dashboard/list/${listId}`);
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className={`text-white hover:bg-gray-700 ${className || ''}`}>
                    <EyeIcon className="w-4 h-4 mr-1" />
                    Check Other User's List
                </Button>
            </DialogTrigger>
            <DialogPortal>
                <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg border shadow-lg sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>
                            <p className="text-xl font-bold">Check Other User's List</p>
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-8 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    List ID
                                </Label>
                                <Input 
                                    id="listId" 
                                    value={listId} 
                                    onChange={(e) => setListId(e.target.value)} 
                                    className="col-span-7 bg-gray-700 text-white text-lg"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="destructive" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" color="green">
                                Go
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    )
}

export default CheckListDialog;