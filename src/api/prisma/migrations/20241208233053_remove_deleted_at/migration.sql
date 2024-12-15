/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `List` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `ListItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "List" DROP COLUMN "deleted_at";

-- AlterTable
ALTER TABLE "ListItem" DROP COLUMN "deleted_at";
