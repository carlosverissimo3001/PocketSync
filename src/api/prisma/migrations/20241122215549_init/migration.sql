-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "list_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "List"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
