import { User } from "./auth.types";

export interface List {
    id: string;
    name: string;
    createdAt?: Date;
    ownerId: string;
    items: ListItem[];
    updatedAt?: Date;
    deleted?: boolean;
    deletedAt?: Date;
    lastEditorId: string;
}

export interface ListExtended extends List {
    owner: Partial<User>;
}

export interface ListItem {
    id: string;
    name: string;
    quantity: number;
    checked: boolean;
    listId: string;
    createdAt?: Date;
    updatedAt?: Date;
    deleted?: boolean;
    deletedAt?: Date;
    lastEditorId: string;
}