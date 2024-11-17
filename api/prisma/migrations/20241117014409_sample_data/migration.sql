-- This is an empty migration.

INSERT INTO List (id, name, createdAt, ownerId) VALUES ('1', 'Groceries', NOW(), '675f55ff-1f21-4c4b-9542-49796d0e203f');
INSERT INTO ListItem (id, name, quantity, checked, listId) VALUES ('1', 'Milk', 2, false, '1');
INSERT INTO ListItem (id, name, quantity, checked, listId) VALUES ('2', 'Bread', 1, false, '1')