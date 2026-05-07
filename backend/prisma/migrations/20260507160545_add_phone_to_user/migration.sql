/*
  Warnings:

  - Added the required column `phone` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "phone" DROP DEFAULT;
