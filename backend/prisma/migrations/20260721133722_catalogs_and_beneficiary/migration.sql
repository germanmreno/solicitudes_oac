/*
  Warnings:

  - You are about to drop the column `aidSpecialty` on the `Census` table. All the data in the column will be lost.
  - You are about to drop the column `aidSpecialtyOther` on the `Census` table. All the data in the column will be lost.
  - You are about to drop the column `aidType` on the `Census` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Census` table. All the data in the column will be lost.
  - Added the required column `aidAreaId` to the `Census` table without a default value. This is not possible if the table is not empty.
  - Added the required column `aidTypeId` to the `Census` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applicantSex` to the `Census` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originTypeId` to the `Census` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MASCULINO', 'FEMENINO');

-- AlterTable
ALTER TABLE "Census" DROP COLUMN "aidSpecialty",
DROP COLUMN "aidSpecialtyOther",
DROP COLUMN "aidType",
DROP COLUMN "origin",
ADD COLUMN     "aidAreaId" TEXT NOT NULL,
ADD COLUMN     "aidAreaOther" TEXT,
ADD COLUMN     "aidTypeId" TEXT NOT NULL,
ADD COLUMN     "applicantSex" "Sex" NOT NULL,
ADD COLUMN     "beneficiaryIdNumber" TEXT,
ADD COLUMN     "beneficiaryName" TEXT,
ADD COLUMN     "beneficiarySameAsApplicant" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "beneficiarySex" "Sex",
ADD COLUMN     "originDetail" TEXT,
ADD COLUMN     "originTypeId" TEXT NOT NULL,
ADD COLUMN     "siteId" TEXT;

-- DropEnum
DROP TYPE "AidSpecialty";

-- CreateTable
CREATE TABLE "OriginType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiresSite" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OriginType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AidType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AidType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AidArea" (
    "id" TEXT NOT NULL,
    "aidTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiresDetail" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AidArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OriginType_name_key" ON "OriginType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AidType_name_key" ON "AidType"("name");

-- CreateIndex
CREATE INDEX "AidArea_aidTypeId_idx" ON "AidArea"("aidTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "AidArea_aidTypeId_name_key" ON "AidArea"("aidTypeId", "name");

-- CreateIndex
CREATE INDEX "Census_originTypeId_idx" ON "Census"("originTypeId");

-- CreateIndex
CREATE INDEX "Census_siteId_idx" ON "Census"("siteId");

-- CreateIndex
CREATE INDEX "Census_aidTypeId_idx" ON "Census"("aidTypeId");

-- CreateIndex
CREATE INDEX "Census_aidAreaId_idx" ON "Census"("aidAreaId");

-- AddForeignKey
ALTER TABLE "AidArea" ADD CONSTRAINT "AidArea_aidTypeId_fkey" FOREIGN KEY ("aidTypeId") REFERENCES "AidType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Census" ADD CONSTRAINT "Census_originTypeId_fkey" FOREIGN KEY ("originTypeId") REFERENCES "OriginType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Census" ADD CONSTRAINT "Census_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Census" ADD CONSTRAINT "Census_aidTypeId_fkey" FOREIGN KEY ("aidTypeId") REFERENCES "AidType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Census" ADD CONSTRAINT "Census_aidAreaId_fkey" FOREIGN KEY ("aidAreaId") REFERENCES "AidArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
