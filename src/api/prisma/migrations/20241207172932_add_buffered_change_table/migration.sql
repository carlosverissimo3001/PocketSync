-- CreateTable
CREATE TABLE "BufferedChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listId" TEXT,
    "changes" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BufferedChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BufferedChange_userId_idx" ON "BufferedChange"("userId");

-- CreateIndex
CREATE INDEX "BufferedChange_listId_idx" ON "BufferedChange"("listId");

-- AddForeignKey
ALTER TABLE "BufferedChange" ADD CONSTRAINT "BufferedChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BufferedChange" ADD CONSTRAINT "BufferedChange_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE SET NULL ON UPDATE CASCADE;
