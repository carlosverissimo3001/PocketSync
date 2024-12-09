-- AlterTable
ALTER TABLE "ListItem" ADD COLUMN     "last_editor_id" TEXT;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_last_editor_id_fkey" FOREIGN KEY ("last_editor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
