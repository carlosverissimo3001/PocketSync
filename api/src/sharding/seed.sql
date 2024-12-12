-- Enable the UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert initial users
INSERT INTO "User" (id, username, password, "created_at")
VALUES
  (uuid_generate_v4(), 'alice', 'securepassword1', NOW()),
  (uuid_generate_v4(), 'bob', 'securepassword2', NOW());

-- Retrieve user IDs for foreign key references
WITH users AS (
  SELECT id, username FROM "User"
)
-- Insert initial lists
INSERT INTO "List" (id, name, "created_at", "owner_id", "updated_at", deleted)
VALUES
  (uuid_generate_v4(), 'Groceries', NOW(), (SELECT id FROM users WHERE username = 'alice'), NOW(), false),
  (uuid_generate_v4(), 'Work Tasks', NOW(), (SELECT id FROM users WHERE username = 'bob'), NOW(), false);

-- Retrieve list IDs for foreign key references
WITH lists AS (
  SELECT id, name FROM "List"
)
-- Insert initial list items
INSERT INTO "ListItem" (id, name, quantity, checked, "updated_at", "list_id", "created_at", deleted)
VALUES
  (uuid_generate_v4(), 'Apples', 5, false, NOW(), (SELECT id FROM lists WHERE name = 'Groceries'), NOW(), false),
  (uuid_generate_v4(), 'Prepare Presentation', 1, false, NOW(), (SELECT id FROM lists WHERE name = 'Work Tasks'), NOW(), false);

-- Insert initial buffered changes (optional)
WITH users AS (
  SELECT id, username FROM "User"
), lists AS (
  SELECT id, name FROM "List"
)
INSERT INTO "BufferedChange" (id, "userId", "listId", changes, timestamp, resolved, "isProcessing")
VALUES
  (uuid_generate_v4(), (SELECT id FROM users WHERE username = 'alice'), (SELECT id FROM lists WHERE name = 'Groceries'), '{"action":"add_item","item":"Bananas"}', NOW(), false, false);