import { parse } from 'csv-parse';
import { prisma } from '../../lib/prisma.js';
import { cedulaRegex } from '../auth/auth.schema.js';
import { reserveFileNumber } from '../census/census.service.js';
import { writeAudit } from '../audit/audit.service.js';

const norm = (s: string | undefined) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const HEADER_MAP: Record<string, string> = {
  FECHA: 'registrationDate',
  NROEXPEDIENTE: 'fileNumber',
  NRODEEXPEDIENTE: 'fileNumber',
  NUMERODEEXPEDIENTE: 'fileNumber',
  NEXPEDIENTE: 'fileNumber',
  EXPEDIENTE: 'fileNumber',
  SOLICITANTE: 'applicantName',
  NOMBRE: 'applicantName',
  NOMBREDELSOLICITANTE: 'applicantName',
  CEDULA: 'applicantIdNumber',
  CEDULADEIDENTIDAD: 'applicantIdNumber',
  CEDULADEIDENTIFICACION: 'applicantIdNumber',
  IDENTIFICACION: 'applicantIdNumber',
  TIPOSEXOSOLICITANTE: 'applicantSex',
  TIPODESEXOSOLICITANTE: 'applicantSex',
  SEXOSOLICITANTE: 'applicantSex',
  SEXO: 'applicantSex',
  BENEFICIARIO: 'beneficiaryName',
  NOMBREDELBENEFICIARIO: 'beneficiaryName',
  TIPOSEXOBENEFICIARIO: 'beneficiarySex',
  TIPODESEXOBENEFICIARIO: 'beneficiarySex',
  SEXOBENEFICIARIO: 'beneficiarySex',
  PROCEDENCIA: 'originType',
  TIPODEPROCEDENCIA: 'originType',
  TELEFONO: 'phone',
  TIPODESOLICITANTE: 'applicantType',
  TIPODEPERSONAL: 'personnelType',
  TIPODEAUDA: 'aidType',
  TIPODEAYUDA: 'aidType',
  AUDA: 'aidType',
  DESCRIPCION: 'aidDescription',
  DESCRIPCIONDELAAYUDA: 'aidDescription',
  ESPECIALIDAD: 'aidArea',
  AREA: 'aidArea',
  NOPROCEDE: 'noProcede',
  MODALIDAD: 'managementMode',
  MODALIDADDEGESTION: 'managementMode',
  ORGANISMOCOOPERANTE: 'cooperatingEntity',
  ENTEUORGANISMOCOOPERANTE: 'cooperatingEntity',
  ENTE: 'cooperatingEntity',
  PROVEEDOR: 'aidProvider',
  OBSERVACION: 'aidObservation',
  OBSERVACIONES: 'aidObservation',
  RESPONSABLE: 'responsibleName',
  MONTO: 'amountUsd',
  MONTOUSD: 'amountUsd',
  MONTODOLARES: 'amountUsd',
  MONTOBS: 'amountBs',
  MONTEBOLIVARES: 'amountBs',
  TASA: 'paymentRate',
  TASADELDIA: 'paymentRate',
  FECHADEPAGO: 'paymentDate',
  ESTATUS: 'aidStatus',
  ESTADO: 'aidStatus',
  FACTURA: 'invoiceNote',
};

const NA_VALUES = new Set(['NA', 'N/A', 'SININFORMACION', '-', 'NONE', 'NINGUNA', 'NINGUNO']);

function clean(value: string | undefined): string | undefined {
  const s = (value || '').replace(/\s+/g, ' ').trim();
  if (!s || NA_VALUES.has(norm(s))) return undefined;
  return s;
}

const SEX_MAP: Record<string, 'MASCULINO' | 'FEMENINO'> = {
  M: 'MASCULINO',
  MASCULINO: 'MASCULINO',
  F: 'FEMENINO',
  FEMENINO: 'FEMENINO',
};

const PROCESS_STATUS_MAP: Record<string, AidStatus> = {
  ATENDIDO: 'ATENDIDO',
  ATENDIDA: 'ATENDIDO',
  CERRADO: 'ATENDIDO',
  CERRADA: 'ATENDIDO',
  ENPROCESO: 'EN_PROCESO',
  PROCESO: 'EN_PROCESO',
  ENEVALUACION: 'EN_EVALUACION',
  EVALUACION: 'EN_EVALUACION',
  NOPROCEDE: 'NO_PROCEDE',
};

const PAYMENT_MAP: Record<string, PaymentStatus> = {
  PAGADO: 'PAGADO',
  PENDIENTE: 'PENDIENTE',
  ANULADO: 'ANULADO',
};

const NO_PROCEDE_YES = new Set(['S', 'SI', 'X', '1', 'TRUE']);

type AidStatus = 'ATENDIDO' | 'EN_PROCESO' | 'EN_EVALUACION' | 'NO_PROCEDE';
type PaymentStatus = 'PENDIENTE' | 'PAGADO' | 'ANULADO';

function parseSex(value: string | undefined): 'MASCULINO' | 'FEMENINO' | undefined {
  const s = norm(value);
  if (!s || NA_VALUES.has(s)) return undefined;
  const mapped = SEX_MAP[s];
  if (!mapped) throw new Error(`Sexo no válido: "${value}"`);
  return mapped;
}

function parseProcessStatus(value: string | undefined): AidStatus | undefined {
  const s = norm(value);
  if (!s) return undefined;
  return PROCESS_STATUS_MAP[s];
}

function parsePaymentStatus(value: string | undefined): PaymentStatus | undefined {
  const s = norm(value);
  if (!s) return undefined;
  return PAYMENT_MAP[s];
}

function isNoProcede(value: string | undefined): boolean {
  return NO_PROCEDE_YES.has(norm(value));
}

function classifyAidType(value: string | undefined): string {
  const s = norm(value);
  if (/FUNERAR|DONACION|INTERINSTITUCIONAL|INFRAESTRUCTURA|CONSTRUCCION|SERVICIOS/.test(s)) return 'Social';
  return 'Médica';
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s/(])\p{L}/gu, (m) => m.toUpperCase());
}

function parseDate(value: string | undefined): Date | undefined {
  const s = (value || '').trim();
  if (!s) return undefined;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  return undefined;
}

function parseDecimal(value: string | undefined): string | undefined {
  const m = (value || '').toString().trim().match(/\d[\d.,]*/);
  if (!m) return undefined;
  let t = m[0];
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  if (Number.isNaN(n)) throw new Error(`Monto/tasa no válido: "${value}"`);
  return String(n);
}

function normalizeCedula(value: string | undefined): string {
  let s = (value || '').trim().toUpperCase();
  if (!s) return s;
  s = s.replace(/^C\.?\s*I\.?\s*/i, '');
  s = s.replace(/[\s.]/g, '');
  if (!/^[VENE]-\d+$/.test(s)) s = `V-${s}`;
  return s;
}

function detectDelimiter(buffer: Buffer): string {
  const text = buffer.toString('utf-8').split(/\r?\n/).find((l) => l.trim().length > 0) || '';
  const counts = [',', ';', '\t'].map((d) => ({ d, n: text.split(d).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  const top = counts[0];
  return top && top.n > 0 ? top.d : ',';
}

export interface ImportError {
  row: number;
  fileNumber: string | null;
  applicantName: string | null;
  applicantIdNumber: string | null;
  message: string;
}

export interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

export async function importCensusCsv(buffer: Buffer, actorId: string): Promise<ImportResult> {
  const delimiter = detectDelimiter(buffer);
  const rows = await new Promise<string[][]>((resolve, reject) => {
    parse(buffer, {
      bom: true,
      trim: true,
      skip_empty_lines: true,
      delimiter,
      relax_column_count: true,
      relax_quotes: true,
    }, (err, out) => (err ? reject(err) : resolve(out as string[][])));
  });

  let headerRow: string[] = rows[0] ?? [];
  let header: string[] = [];
  let best = 0;
  for (const row of rows) {
    const mapped = row.map((h) => HEADER_MAP[norm(h)] ?? '');
    const hits = mapped.filter(Boolean).length;
    if (hits > best) {
      best = hits;
      headerRow = row;
      header = mapped;
    }
  }
  if (best === 0) throw new Error('El CSV no tiene encabezados');

  const originTypes = await prisma.originType.findMany({ select: { id: true, name: true, requiresSite: true } });
  const sites = await prisma.site.findMany({ select: { id: true, name: true } });
  const externalOrigins = await prisma.externalOrigin.findMany({ select: { id: true, name: true } });
  const aidTypes = await prisma.aidType.findMany({ select: { id: true, name: true } });
  const aidAreas = await prisma.aidArea.findMany({ select: { id: true, aidTypeId: true, name: true } });

  const originByName = new Map<string, typeof originTypes[number]>();
  for (const o of originTypes) originByName.set(norm(o.name), o);
  const siteByName = new Map<string, string>();
  for (const s of sites) siteByName.set(norm(s.name), s.id);
  const externalOriginByName = new Map<string, string>();
  for (const e of externalOrigins) externalOriginByName.set(norm(e.name), e.id);
  const aidTypeByName = new Map<string, string>();
  for (const t of aidTypes) aidTypeByName.set(norm(t.name), t.id);
  const areaByTypeAndName = new Map<string, string>();
  for (const a of aidAreas) areaByTypeAndName.set(`${a.aidTypeId}::${norm(a.name)}`, a.id);

  const result: ImportResult = { successCount: 0, errorCount: 0, errors: [] };
  let rowNumber = 1;
  let createdAreas = 0;
  let createdSites = 0;
  let createdExternalOrigins = 0;

  for (const row of rows) {
    if (row === headerRow || row.every((c) => (c || '').trim() === '')) continue;
    rowNumber++;
    let caseInfo = { fileNumber: null as string | null, applicantName: null as string | null, applicantIdNumber: null as string | null };
    try {
      const fields: Record<string, string> = {};
      header.forEach((key, i) => {
        if (key && row[i] !== undefined && (row[i] || '').trim() !== '') fields[key] = row[i].trim();
      });

      caseInfo = {
        fileNumber: (fields.fileNumber || '').trim() || null,
        applicantName: (fields.applicantName || '').trim() || null,
        applicantIdNumber: (fields.applicantIdNumber || '').trim() || null,
      };

      const applicantName = (fields.applicantName || '').trim();
      const applicantIdNumber = normalizeCedula(fields.applicantIdNumber);
      const applicantSex = parseSex(fields.applicantSex);

      if (!applicantName || applicantName.length < 3) throw new Error('Falta el nombre del solicitante');
      if (!applicantIdNumber || !cedulaRegex.test(applicantIdNumber)) {
        throw new Error(`Cédula inválida: "${fields.applicantIdNumber}"`);
      }
      if (!applicantSex) throw new Error('Falta el sexo del solicitante');

      const origin = originByName.get(norm(fields.applicantType)) ?? originByName.get('EXTERNO');
      if (!origin) throw new Error('Procedencia no encontrada');

      const procedencia = clean(fields.originType);
      let siteId: string | null = null;
      let externalOriginId: string | null = null;
      let originTypeId = origin.id;
      if (origin.requiresSite) {
        if (!procedencia) throw new Error('Falta la sede para la procedencia interna');
        const siteKey = norm(procedencia);
        siteId = siteByName.get(siteKey) ?? null;
        if (!siteId) {
          const created = await prisma.site.create({
            data: { name: procedencia, active: true },
            select: { id: true },
          });
          siteId = created.id;
          siteByName.set(siteKey, siteId);
          createdSites++;
        }
      } else if (procedencia) {
        const extKey = norm(procedencia);
        externalOriginId = externalOriginByName.get(extKey) ?? null;
        if (!externalOriginId) {
          const created = await prisma.externalOrigin.create({
            data: { name: procedencia, active: true },
            select: { id: true },
          });
          externalOriginId = created.id;
          externalOriginByName.set(extKey, externalOriginId);
          createdExternalOrigins++;
        }
      }

      const aidTypeName = classifyAidType(fields.aidType);
      const aidTypeId = aidTypeByName.get(norm(aidTypeName));
      if (!aidTypeId) throw new Error(`Tipo de ayuda no encontrado: "${aidTypeName}"`);

      const areaName = titleCase(clean(fields.aidArea) ?? 'Otros');
      const areaKey = `${aidTypeId}::${norm(areaName)}`;
      let aidAreaId = areaByTypeAndName.get(areaKey);
      if (!aidAreaId) {
        const created = await prisma.aidArea.create({
          data: { aidTypeId, name: areaName, requiresDetail: false, active: true },
          select: { id: true },
        });
        aidAreaId = created.id;
        areaByTypeAndName.set(areaKey, aidAreaId);
        createdAreas++;
      }

      const description = clean(fields.aidDescription) ?? clean(fields.aidType) ?? 'Solicitud de ayuda';

      const beneficiaryName = clean(fields.beneficiaryName);
      const beneficiarySameAsApplicant = !beneficiaryName;
      const beneficiarySex = parseSex(fields.beneficiarySex);

      const aidStatus = isNoProcede(fields.noProcede)
        ? 'NO_PROCEDE'
        : parseProcessStatus(fields.noProcede) ?? parseProcessStatus(fields.aidStatus) ?? 'EN_PROCESO';
      const paymentStatus = parsePaymentStatus(fields.aidStatus) ?? parsePaymentStatus(fields.noProcede);

      let fileNumber = (fields.fileNumber || '').trim();
      if (!fileNumber) {
        fileNumber = await reserveFileNumber();
      } else if (!/^OAC-\d{4}-\d{4}$/i.test(fileNumber)) {
        throw new Error(`Número de expediente inválido: "${fields.fileNumber}"`);
      }

      await prisma.census.create({
        data: {
          fileNumber,
          registrationDate: parseDate(fields.registrationDate) ?? new Date(),
          applicantName,
          applicantIdNumber,
          applicantSex,
          applicantType: clean(fields.applicantType) ?? null,
          personnelType: clean(fields.personnelType) ?? null,
          originTypeId,
          siteId,
          externalOriginId,
          originDetail: null,
          phone: clean(fields.phone) ?? null,
          email: null,
          beneficiarySameAsApplicant,
          beneficiaryName: beneficiaryName ?? null,
          beneficiaryIdNumber: null,
          beneficiarySex: beneficiarySex ?? null,
          aidTypeId,
          aidAreaId,
          aidAreaOther: clean(fields.aidType) ?? null,
          aidDescription: description,
          managementMode: clean(fields.managementMode) ?? null,
          cooperatingEntity: clean(fields.cooperatingEntity) ?? null,
          aidStatus,
          aidProvider: clean(fields.aidProvider) ?? null,
          aidObservation: clean(fields.aidObservation) ?? null,
          amountUsd: parseDecimal(fields.amountUsd) ?? null,
          amountBs: parseDecimal(fields.amountBs) ?? null,
          paymentRate: parseDecimal(fields.paymentRate) ?? null,
          paymentDate: parseDate(fields.paymentDate) ?? null,
          paymentStatus,
          invoiceNote: clean(fields.invoiceNote) ?? null,
          responsibleName: clean(fields.responsibleName) ?? null,
          createdById: actorId,
        },
      });
      result.successCount++;
    } catch (err) {
      result.errorCount++;
      result.errors.push({
        ...caseInfo,
        row: rowNumber,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await writeAudit({
    userId: actorId,
    action: 'IMPORT_CENSUS',
    entity: 'Census',
    entityId: null,
    payload: { successCount: result.successCount, errorCount: result.errorCount, createdAreas, createdSites, createdExternalOrigins },
  });

  return result;
}

export const IMPORT_CSV_TEMPLATE = [
  'FECHA,NRO DE EXPEDIENTE,SOLICITANTE,CÉDULA DE IDENTIDAD,TIPO DE SEXO SOLICITANTE,BENEFICIARIO,TIPO DE SEXO BENEFICIARIO,PROCEDENCIA,TELÉFONO,TIPO DE SOLICITANTE,TIPO DE PERSONAL,TIPO DE AYUDA,DESCRIPCION,ESPECIALIDAD,NO PROCEDE,MODALIDAD DE GESTION,ENTE U ORGANISMO COOPERANTE,PROVEEDOR,OBSERVACION,RESPONSABLE,MONTO $,MONTO BS,TASA,FECHA DE PAGO,ESTATUS,FACTURA',
  '05/06/2026,,Juan Pérez,V-27376369,MASCULINO,,,Externo,04141234567,Persona natural,Administrativo,Médica,Tratamiento especializado,Cardiología,,Gestión directa,Ente cooperante X,Proveedor Y,Observación de prueba,Juan Pérez,100.00,0.00,0.0000,,EN_EVALUACION,FACT-001',
].join('\n');
