export interface List {
    id: string;
    name: string;
    createdAt?: Date;
    ownerId: string;
    items: ListItem[];
}

export interface ListItem {
    id: string;
    name: string;
    quantity: number;
    checked: boolean;
    listId: string;
    createdAt?: Date;
}