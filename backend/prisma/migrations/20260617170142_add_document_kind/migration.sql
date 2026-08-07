-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('MEDICAL', 'INVOICE');

-- AlterTable
ALTER TABLE "CensusDocument" ADD COLUMN     "kind" "DocumentKind" NOT NULL DEFAULT 'MEDICAL';
