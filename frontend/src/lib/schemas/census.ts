import { format, parse, setHours } from 'date-fns';
import { z } from 'zod';

export const cedulaRegex = /^[VENE]-\d{6,8}$/i;
export const siturRegex = /^C-\d{9}$/i;
export const cedulaOrSiturRegex = /^([VENE]-\d{6,8}|C-\d{9})$/i;
export const idNumberRegex = /^([VENE]-\d{6,8}|C-\d{9}|N\/A|N\/P)$/i;
export const ID_NUMBER_MESSAGE =
  'Formato inválido. Use V-27376369, E-1234567, N-12345678, C-123456789 (SITUR), N/A (no aplica) o N/P (no posee)';
export const SENTINEL_ID_NUMBERS = ['N/A', 'N/P'] as const;
export const isSentinelIdNumber = (value: string): boolean =>
  SENTINEL_ID_NUMBERS.includes(value.trim().toUpperCase() as (typeof SENTINEL_ID_NUMBERS)[number]);
export const isSiturIdNumber = (value: string): boolean => siturRegex.test((value || '').trim());

export const cedulaSchema = z.string().trim().regex(idNumberRegex, ID_NUMBER_MESSAGE);

export const fileNumberRegex = /^OAC-\d{4}(?:-\d+)?-\d{4}$/i;

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const sexSchema = z.enum(['MASCULINO', 'FEMENINO', 'NO_APLICA']);

export const aidStatusSchema = z.enum([
  'ATENDIDO',
  'EN_PROCESO',
  'EN_EVALUACION',
  'NO_PROCEDE',
]);

export const paymentStatusSchema = z.enum(['PENDIENTE', 'PAGADO', 'ANULADO']);

export const optionalString = z
  .string()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

export function normalizeDecimalInput(value: string): string | undefined {
  const s = value.trim().replace(/\s+/g, '');
  if (s === '') return undefined;
  if (!/^\d[\d.,]*$/.test(s)) return undefined;

  let t = s;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  const lastSep = Math.max(lastComma, lastDot);
  if (lastSep !== -1) {
    const sep = t.charAt(lastSep);
    const decimals = t.length - lastSep - 1;
    const isSingleGrouping = decimals === 3 && t.indexOf(sep) === lastSep;
    if (isSingleGrouping) {
      t = t.replace(/[.,]/g, '');
    } else {
      const intPart = t.slice(0, lastSep).replace(/[.,]/g, '');
      const fracPart = t.slice(lastSep + 1).replace(/[.,]/g, '');
      t = `${intPart}.${fracPart}`;
    }
  }

  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  const canonical = String(n);
  return /^\d+(\.\d{1,4})?$/.test(canonical) ? canonical : undefined;
}

export function isValidDecimalInput(value: string): boolean {
  const s = value.trim();
  return s === '' || normalizeDecimalInput(s) !== undefined;
}

export const optionalDecimal = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine(isValidDecimalInput, {
    message: 'Monto inválido. Use formatos como 1.234,56 o 1234.56 (máx. 4 decimales)',
  })
  .transform((v) => (v.trim() === '' ? undefined : normalizeDecimalInput(v)))
  .optional();

export function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function dateInputToIso(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  if (Number.isNaN(parsed.getTime())) return undefined;
  return setHours(parsed, 12).toISOString();
}

export const censusFormSchema = z
  .object({
    fileNumber: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, '').toUpperCase())
      .refine((v) => v === '' || fileNumberRegex.test(v), {
        message: 'Formato inválido (ej. OAC-0001-2026 o OAC-0309-1-2026)',
      })
      .transform((v) => (v === '' ? undefined : v))
      .optional(),
    registrationDate: optionalString,
    applicantName: z.string().trim().min(3, 'El nombre del solicitante es obligatorio'),
    applicantIdNumber: cedulaSchema,
    applicantSex: sexSchema,
    applicantType: optionalString,
    personnelType: optionalString,
    originTypeId: z.string().min(1, 'Seleccione un tipo de procedencia'),
    siteId: z.string().optional(),
    externalOriginId: z.string().optional(),
    originDetail: optionalString,
    phone: optionalString,
    email: z
      .string()
      .trim()
      .email('Correo inválido')
      .or(z.literal(''))
      .transform((v) => (v === '' ? undefined : v))
      .optional(),

    beneficiarySameAsApplicant: z.boolean().default(true),
    beneficiaryName: optionalString,
    beneficiaryIdNumber: optionalString,
    beneficiarySex: sexSchema.optional(),

    aidTypeId: z.string().min(1, 'Seleccione un tipo de ayuda'),
    aidAreaId: z.string().min(1, 'Seleccione un área de ayuda'),
    aidAreaOther: optionalString,
    aidDescription: z.string().trim().min(2, 'La descripción es obligatoria'),
    managementMode: optionalString,
    cooperatingEntity: optionalString,
    aidStatus: aidStatusSchema.default('EN_EVALUACION'),
    aidProvider: optionalString,
    aidObservation: optionalString,
    amountUsd: optionalDecimal,
    amountBs: optionalDecimal,

    paymentRate: optionalDecimal,
    paymentDate: optionalString,
    paymentStatus: paymentStatusSchema.optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
    invoiceNote: optionalString,
    responsibleName: optionalString,
  })
  .superRefine((data, ctx) => {
    if (!data.beneficiarySameAsApplicant) {
      if (!data.beneficiaryName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['beneficiaryName'],
          message: 'Debe indicar el nombre del beneficiario',
        });
      }
      if (!data.beneficiaryIdNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['beneficiaryIdNumber'],
          message: 'Debe indicar la cédula del beneficiario',
        });
      } else if (!idNumberRegex.test(data.beneficiaryIdNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['beneficiaryIdNumber'],
          message: ID_NUMBER_MESSAGE,
        });
      }
      if (!data.beneficiarySex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['beneficiarySex'],
          message: 'Debe indicar el sexo del beneficiario',
        });
      }
    }
  });

export type CensusFormValues = z.infer<typeof censusFormSchema>;
