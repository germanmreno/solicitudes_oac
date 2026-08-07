-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "AidStatus" AS ENUM ('ATENDIDO', 'EN_PROCESO', 'EN_EVALUACION', 'NO_PROCEDE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'PAGADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "AidSpecialty" AS ENUM ('CARDIOLOGIA', 'PEDIATRIA', 'GINECOLOGIA_OBSTETRICIA', 'TRAUMATOLOGIA_ORTOPEDIA', 'MEDICINA_INTERNA', 'CIRUGIA_GENERAL', 'DERMATOLOGIA', 'OFTALMOLOGIA', 'OTORRINOLARINGOLOGIA', 'NEUROLOGIA', 'PSIQUIATRIA', 'PSICOLOGIA', 'ODONTOLOGIA', 'UROLOGIA', 'ENDOCRINOLOGIA', 'GASTROENTEROLOGIA', 'NEUMOLOGIA', 'NEFROLOGIA', 'ONCOLOGIA', 'HEMATOLOGIA', 'REUMATOLOGIA', 'INFECTOLOGIA', 'ANESTESIOLOGIA', 'RADIOLOGIA', 'MEDICINA_GENERAL', 'FISIATRIA', 'NUTRICION', 'OTRAS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Census" (
    "id" TEXT NOT NULL,
    "fileNumber" TEXT,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicantName" TEXT NOT NULL,
    "applicantIdNumber" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "idDocumentPath" TEXT,
    "aidType" TEXT NOT NULL,
    "aidDescription" TEXT NOT NULL,
    "aidSpecialty" "AidSpecialty" NOT NULL,
    "aidSpecialtyOther" TEXT,
    "aidStatus" "AidStatus" NOT NULL DEFAULT 'EN_EVALUACION',
    "aidProvider" TEXT,
    "aidObservation" TEXT,
    "amountUsd" DECIMAL(12,2),
    "amountBs" DECIMAL(14,2),
    "paymentRate" DECIMAL(10,4),
    "paymentDate" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus",
    "invoicePath" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Census_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CensusDocument" (
    "id" TEXT NOT NULL,
    "censusId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CensusDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Census_fileNumber_key" ON "Census"("fileNumber");

-- CreateIndex
CREATE INDEX "Census_applicantIdNumber_idx" ON "Census"("applicantIdNumber");

-- CreateIndex
CREATE INDEX "Census_registrationDate_idx" ON "Census"("registrationDate");

-- CreateIndex
CREATE INDEX "Census_aidStatus_idx" ON "Census"("aidStatus");

-- CreateIndex
CREATE INDEX "Census_createdById_idx" ON "Census"("createdById");

-- CreateIndex
CREATE INDEX "CensusDocument_censusId_idx" ON "CensusDocument"("censusId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Census" ADD CONSTRAINT "Census_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CensusDocument" ADD CONSTRAINT "CensusDocument_censusId_fkey" FOREIGN KEY ("censusId") REFERENCES "Census"("id") ON DELETE CASCADE ON UPDATE CASCADE;
