/*
  Warnings:

  - You are about to drop the column `originalCategory` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentId_fkey";

-- DropIndex
DROP INDEX "Category_userId_name_key";

-- DropIndex
DROP INDEX "Transaction_userId_date_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "color" DROP DEFAULT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "originalCategory",
ALTER COLUMN "tags" DROP DEFAULT,
ALTER COLUMN "attachments" DROP DEFAULT;

-- AlterTable
-- First add the column with default, then update existing users, then remove default
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
UPDATE "User" SET "passwordHash" = "password" WHERE "passwordHash" IS NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "User" DROP COLUMN "password";

-- CreateTable
CREATE TABLE "CategoryPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "categoryId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isUserCorrection" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryPattern_userId_idx" ON "CategoryPattern"("userId");

-- CreateIndex
CREATE INDEX "CategoryPattern_description_idx" ON "CategoryPattern"("description");

-- CreateIndex
CREATE INDEX "CategoryPattern_merchant_idx" ON "CategoryPattern"("merchant");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPattern" ADD CONSTRAINT "CategoryPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPattern" ADD CONSTRAINT "CategoryPattern_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
