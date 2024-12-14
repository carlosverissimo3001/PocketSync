/*
  Warnings:

  - You are about to drop the column `last_editor_id` on the `List` table. All the data in the column will be lost.
  - You are about to drop the column `last_editor_id` on the `ListItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "List" DROP CONSTRAINT "List_last_editor_id_fkey";

-- DropForeignKey
ALTER TABLE "ListItem" DROP CONSTRAINT "ListItem_last_editor_id_fkey";

-- AlterTable
ALTER TABLE "List" DROP COLUMN "last_editor_id",
ADD COLUMN     "lastEditorUsername" TEXT;

-- AlterTable
ALTER TABLE "ListItem" DROP COLUMN "last_editor_id",
ADD COLUMN     "lastEditorUsername" TEXT;
