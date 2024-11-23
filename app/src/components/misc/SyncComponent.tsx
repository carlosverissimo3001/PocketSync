import { RefreshCcw, Clock, ChevronUp } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncComponentProps {
  onClick: () => void;
  isLoading: boolean;
  lastSync: Date | null;
  onFrequencyChange?: (minutes: number) => void;
  currentFrequency?: number; // in minutes
}

export const SyncComponent = ({ 
  onClick, 
  isLoading, 
  lastSync,
  onFrequencyChange,
  currentFrequency = 30 
}: SyncComponentProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-8 right-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg transition-all duration-300 ease-in-out">
        {/* Frequency Settings Panel */}
        {isExpanded && (
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-sync frequency</span>
            </div>
            <Select
              value={currentFrequency.toString()}
              onValueChange={(value) => onFrequencyChange?.(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
                <SelectItem value="120">Every 2 hours</SelectItem>
                <SelectItem value="0">Manual only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Main Sync Panel */}
        <div className="px-6 py-3 flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1 hover:bg-transparent"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <ChevronUp className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
                    isExpanded ? '' : 'rotate-180'
                  }`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Choose how often your data automatically updates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Last synced
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
              {lastSync ? xTimeAgo(lastSync) : 'Never'}
            </span>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onClick}
                  disabled={isLoading}
                  variant="ghost"
                  size="icon"
                  className={`
                    relative rounded-full p-3 ml-auto
                    ${isLoading 
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                      : 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }
                    transition-all duration-200 ease-in-out
                  `}
                >
                  <RefreshCcw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-indigo-200 dark:bg-indigo-700 opacity-25" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Trigger an instant sync</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};