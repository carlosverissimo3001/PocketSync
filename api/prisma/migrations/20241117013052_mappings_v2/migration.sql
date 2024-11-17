/*
  Warnings:

  - You are about to drop the column `listId` on the `ListItem` table. All the data in the column will be lost.
  - Added the required column `list_id` to the `ListItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ListItem" DROP CONSTRAINT "ListItem_listId_fkey";

-- AlterTable
ALTER TABLE "ListItem" DROP COLUMN "listId",
ADD COLUMN     "list_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "List"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
