-- AlterTable
ALTER TABLE "List" ADD COLUMN     "last_editor_id" TEXT;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_last_editor_id_fkey" FOREIGN KEY ("last_editor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
