-- AlterTable
ALTER TABLE "Census" ADD COLUMN     "externalOriginId" TEXT;

-- CreateTable
CREATE TABLE "ExternalOrigin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalOrigin_name_key" ON "ExternalOrigin"("name");

-- CreateIndex
CREATE INDEX "Census_externalOriginId_idx" ON "Census"("externalOriginId");

-- AddForeignKey
ALTER TABLE "Census" ADD CONSTRAINT "Census_externalOriginId_fkey" FOREIGN KEY ("externalOriginId") REFERENCES "ExternalOrigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
