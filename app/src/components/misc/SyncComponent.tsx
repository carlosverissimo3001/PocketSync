import { Clock, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { xTimeAgo } from "@/utils/date";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SyncComponentProps {
  lastSync: Date | null;
  onFrequencyChange?: (minutes: number) => void;
  currentFrequency?: number; // in minutes
  isServerAlive: boolean;
}


export const SyncComponent = ({
  lastSync,
  onFrequencyChange,
  currentFrequency = 30,
  isServerAlive,
}: SyncComponentProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg transition-all duration-300 ease-in-out border border-gray-200 dark:border-gray-700">
        {/* Frequency Settings Panel */}
        {isExpanded && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Sync frequency
              </span>
            </div>
            <Select
              value={currentFrequency.toString()}
              onValueChange={(value) => onFrequencyChange?.(Number(value))}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Only when I make changes</SelectItem>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
                <SelectItem value="120">Every 2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Main Sync Panel */}
        <div className="px-3 py-2 flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="p-0.5 hover:bg-transparent"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronUp
              className={`h-3 w-3 text-gray-400 transition-transform duration-300 ${
                isExpanded ? "" : "rotate-180"
              }`}
            />
          </Button>

          {/* Status Information */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Last sync
              </span>
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                {lastSync ? xTimeAgo(lastSync) : "Never"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  isServerAlive ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {isServerAlive ? "Connected" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
