-- AlterTable
ALTER TABLE "Census" ADD COLUMN     "idDocumentTypeId" TEXT,
ADD COLUMN     "invoiceTypeId" TEXT;

-- CreateIndex
CREATE INDEX "AidTypeDocumentType_documentTypeId_idx" ON "AidTypeDocumentType"("documentTypeId");

-- AddForeignKey
ALTER TABLE "Census" ADD CONSTRAINT "Census_idDocumentTypeId_fkey" FOREIGN KEY ("idDocumentTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Census" ADD CONSTRAINT "Census_invoiceTypeId_fkey" FOREIGN KEY ("invoiceTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
