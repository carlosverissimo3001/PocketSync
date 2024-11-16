import { format } from "date-fns";

export const formatDateToMMMDDYYYY = (date: Date) => {
    return format(date, "MMM dd, yyyy");
};