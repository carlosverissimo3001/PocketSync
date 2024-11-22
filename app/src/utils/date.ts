import { format, formatDistanceToNow } from "date-fns";

export const formatDateToMMMDDYYYY = (date: Date) => {
    return format(date, "MMM dd, yyyy");
};

export const xTimeAgo = (date: Date) => {
  return formatDistanceToNow(date, { addSuffix: true });
};
