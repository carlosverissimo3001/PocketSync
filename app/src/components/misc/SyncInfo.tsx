import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSync } from "@/contexts/SyncContext";
import { xTimeAgo } from "@/utils/date";

export const SyncInfo = () => {
    const { lastSync } = useSync();
  
    const features = [
    {
      title: "Real-time Saves",
      description: "Every change you make is instantly saved to the server",
      icon: "💾",
    },
    {
      title: "Periodic Sync",
      description: "Lists are regularly synced to ensure you're always up to date",
      icon: "🔄",
    },
    {
      title: "Offline Support",
      description: "Keep working even without internet - changes sync when you're back online",
      icon: "📶",
    },
    {
      title: "Customizable",
      description: "Set your preferred sync frequency from the sync panel",
      icon: "⚡",
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
        >
          <Info/>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-indigo-500">Sync</span> System
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg">
            <div className={`h-2 w-2 rounded-full ${
              lastSync 
                ? "bg-green-500 animate-pulse motion-safe:animate-[pulse_2s_ease-in-out_infinite]" 
                : "bg-red-500"
            }`}>
            </div>
            <span className="text-sm text-indigo-700 dark:text-indigo-300">
              {lastSync ? `Your lists were last synced ${xTimeAgo(lastSync)}` : 'Your lists were never synced ⚠️'}
            </span>
          </div>

          <div className="grid gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-4",
                  "bg-gray-50 dark:bg-gray-900/50 rounded-lg",
                  "transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                )}
              >
                <div className="text-xl">{feature.icon}</div>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 italic text-center">
            Tip: Click the sync button in the bottom right corner to sync manually
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};