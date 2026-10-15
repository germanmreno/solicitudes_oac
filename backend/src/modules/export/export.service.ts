import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import type { AidStatus, Sex } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, '../../../assets/oac-export-template.xlsx');

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const SEX_LABEL: Record<Sex, string> = {
  MASCULINO: 'MASCULINO',
  FEMENINO: 'FEMENINO',
  NO_APLICA: 'N/A',
};

const AID_STATUS_LABEL: Record<AidStatus, string> = {
  ATENDIDO: 'ATENDIDO',
  EN_PROCESO: 'EN PROCESO',
  EN_EVALUACION: 'EN EVALUACION',
  NO_PROCEDE: 'NO PROCEDE',
};

type CellValue = string | number | Date | null;

function monthName(date: Date | null | undefined): string | null {
  if (!date) return null;
  return MONTHS_ES[date.getUTCMonth()] ?? null;
}

function findHeaderRow(ws: ExcelJS.Worksheet): number {
  for (let r = 1; r <= 10; r++) {
    const v = ws.getCell(r, 1).value;
    if (typeof v === 'string' && v.trim().toUpperCase() === 'NRO') return r;
  }
  return 4;
}

interface CensusRow {
  fileNumber: string | null;
  registrationDate: Date;
  applicantName: string;
  applicantIdNumber: string;
  applicantSex: Sex;
  applicantType: string | null;
  personnelType: string | null;
  originDetail: string | null;
  phone: string | null;
  beneficiarySameAsApplicant: boolean;
  beneficiaryName: string | null;
  beneficiarySex: Sex | null;
  aidAreaOther: string | null;
  aidDescription: string;
  aidStatus: AidStatus;
  managementMode: string | null;
  cooperatingEntity: string | null;
  aidProvider: string | null;
  aidObservation: string | null;
  responsibleName: string | null;
  amountUsd: unknown;
  amountBs: unknown;
  paymentRate: unknown;
  paymentDate: Date | null;
  paymentStatus: string | null;
  invoiceNote: string | null;
  site: { name: string } | null;
  externalOrigin: { name: string } | null;
  originType: { name: string } | null;
  aidArea: { name: string } | null;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildRow(c: CensusRow, index: number): CellValue[] {
  const procedencia =
    c.site?.name ?? c.externalOrigin?.name ?? c.originDetail ?? c.originType?.name ?? null;
  const beneficiary = c.beneficiarySameAsApplicant ? 'N/A' : c.beneficiaryName ?? 'N/A';
  const beneficiarySex = c.beneficiarySameAsApplicant
    ? 'N/A'
    : c.beneficiarySex
      ? SEX_LABEL[c.beneficiarySex]
      : 'N/A';

  return [
    index,
    c.registrationDate,
    c.fileNumber ?? null,
    c.applicantName,
    c.applicantIdNumber,
    SEX_LABEL[c.applicantSex] ?? null,
    beneficiary,
    beneficiarySex,
    procedencia,
    c.phone ?? null,
    c.applicantType ?? null,
    c.personnelType ?? null,
    c.aidAreaOther ?? null,
    c.aidDescription ?? null,
    c.aidArea?.name ?? null,
    AID_STATUS_LABEL[c.aidStatus] ?? null,
    c.managementMode ?? null,
    c.cooperatingEntity ?? null,
    c.aidProvider ?? null,
    c.aidObservation ?? null,
    c.responsibleName ?? null,
    num(c.amountUsd),
    num(c.amountBs),
    num(c.paymentRate),
    c.paymentDate ?? null,
    monthName(c.paymentDate),
    c.paymentStatus ?? null,
    c.invoiceNote ?? null,
    null,
    monthName(c.registrationDate),
  ];
}

export async function buildCensusExport(): Promise<Buffer> {
  const rows = (await prisma.census.findMany({
    include: {
      site: { select: { name: true } },
      externalOrigin: { select: { name: true } },
      originType: { select: { name: true } },
      aidArea: { select: { name: true } },
    },
    orderBy: [{ registrationDate: 'asc' }, { fileNumber: 'asc' }],
  })) as unknown as CensusRow[];

  const template = new ExcelJS.Workbook();
  await template.xlsx.readFile(TEMPLATE_PATH);
  const src = template.getWorksheet('DATA CASOS 2026');
  if (!src) throw new Error('Plantilla de exportación inválida');

  const headerRowNum = findHeaderRow(src);
  const titleRowNum = headerRowNum - 1;
  const dataStart = headerRowNum + 1;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('DATA CASOS 2026');

  for (let c = 1; c <= 30; c++) {
    const w = src.getColumn(c).width;
    if (w != null) ws.getColumn(c).width = w;
  }
  for (let r = 1; r <= headerRowNum; r++) {
    const h = src.getRow(r).height;
    if (h != null) ws.getRow(r).height = h;
  }

  const titleCell = ws.getCell(titleRowNum, 1);
  titleCell.value = 'DATA GENERAL';
  titleCell.style = src.getCell(titleRowNum, 1).style;
  ws.mergeCells(titleRowNum, 1, titleRowNum, 30);

  src.getRow(headerRowNum).eachCell({ includeEmpty: true }, (cell, col) => {
    const dst = ws.getCell(headerRowNum, col);
    dst.value = cell.value;
    dst.style = cell.style;
  });

  type ImageBuffer = Parameters<ExcelJS.Workbook['addImage']>[0]['buffer'];
  const media = (template as unknown as { media?: { buffer?: Buffer; extension?: string }[] }).media?.[0];
  if (media?.buffer) {
    const imageId = wb.addImage({
      buffer: media.buffer as unknown as ImageBuffer,
      extension: (media.extension as 'png') ?? 'png',
    });
    ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 636, height: 70 } });
  }

  const counts = { tipoSolicitante: 0, noProcede: 0, observacion: 0, factura: 0 };
  let r = dataStart;
  for (let i = 0; i < rows.length; i++) {
    const values = buildRow(rows[i]!, i + 1);
    const row = ws.getRow(r);
    for (let col = 1; col <= 30; col++) {
      const dst = row.getCell(col);
      dst.style = src.getCell(dataStart, col).style;
      dst.value = values[col - 1] ?? null;
      if (col === 2 || col === 25) dst.numFmt = 'dd/mm/yyyy';
      if (col === 22 || col === 23) dst.numFmt = '#,##0.00';
      if (col === 24) dst.numFmt = '#,##0.0000';
    }
    if (values[10] != null && values[10] !== '') counts.tipoSolicitante++;
    if (values[15] != null && values[15] !== '') counts.noProcede++;
    if (values[19] != null && values[19] !== '') counts.observacion++;
    if (values[27] != null && values[27] !== '') counts.factura++;
    r++;
  }

  const totalRow = ws.getRow(r);
  const totalStyle = (col: number) => src.getCell(dataStart, col).style;
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(1).style = totalStyle(1);
  const setTotal = (col: number, value: number) => {
    totalRow.getCell(col).value = value;
    totalRow.getCell(col).style = totalStyle(col);
  };
  setTotal(11, counts.tipoSolicitante);
  setTotal(16, counts.noProcede);
  setTotal(20, counts.observacion);
  setTotal(28, counts.factura);

  ws.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: r - 1, column: 30 } };
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: headerRowNum }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as unknown as ArrayBuffer);
}
