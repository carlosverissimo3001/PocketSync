export const TOAST_MESSAGES = {
  COPY_SUCCESS: {
    title: "Copied!",
    description: "List ID copied to clipboard",
    variant: "default" as const,
    duration: 3000,
  },
  COPY_FAILED: {
    title: "Failed to copy",
    description: "Could not copy list ID to clipboard",
    variant: "destructive" as const,
    duration: 3000,
  },
  SAVE_SUCCESS: {
    title: "Your changes have been saved 🎉",
    description: "The server will process them shortly",
    duration: 2000,
  },
  SAVE_FAILED: {
    title: "Failed to save changes 😕",
    description: "Please try again",
    variant: "destructive",
    duration: 2000,
  },
  SYNC_ERROR: {
    title: "Sync Error",
    description: "Failed to save synchronized data",
    variant: "destructive" as const,
    duration: 4000,
  },
  SYNC_SENT: {
    title: "Sync request sent 📡",
    description: "Your local lists will be merged with the cloud 🌤️",
    duration: 2000,
  },
  SYNC_FAILED: {
    title: "Sync failed 🚨",
    description: "Looks like the clouds are not reachable right now 🌧️",
    variant: "destructive" as const,
    duration: 3000,
  },
};

export const SYNC_SUCCESS = (listLength: number) => ({
  title: "✨ Lists Updated",
  description: `${listLength} ${listLength === 1 ? 'list' : 'lists'} synchronized from the cloud ☁️`,
  duration: 3000,
  variant: "default" as const,
  className: "bg-green-500 text-white dark:bg-green-600 dark:text-white" as const,
});

