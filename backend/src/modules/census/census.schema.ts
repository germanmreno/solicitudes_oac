import { z } from 'zod';
import { cedulaRegex } from '../auth/auth.schema.js';

export const sexSchema = z.enum(['MASCULINO', 'FEMENINO']);

export const aidStatusSchema = z.enum([
  'ATENDIDO',
  'EN_PROCESO',
  'EN_EVALUACION',
  'NO_PROCEDE',
]);

export const paymentStatusSchema = z.enum(['PENDIENTE', 'PAGADO', 'ANULADO']);

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((v) => v === '' || /^\d+(\.\d{1,4})?$/.test(v), {
    message: 'Monto inválido',
  })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

const optionalString = z
  .string()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const censusFormBaseSchema = z.object({
  fileNumber: optionalString,
  registrationDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),

  applicantName: z.string().trim().min(3, 'El nombre del solicitante es obligatorio'),
  applicantIdNumber: z
    .string()
    .trim()
    .regex(cedulaRegex, 'Formato inválido. Ejemplos: V-27376369, E-1234567, N-12345678'),
  applicantSex: sexSchema,
  originTypeId: z.string().uuid('Seleccione un tipo de procedencia'),
  siteId: z.string().uuid().nullable().optional(),
  originDetail: optionalString,
  phone: optionalString,
  email: z
    .string()
    .trim()
    .email('Correo inválido')
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),

  beneficiarySameAsApplicant: z
    .preprocess((v) => {
      if (v === 'true' || v === true) return true;
      if (v === 'false' || v === false) return false;
      return undefined;
    }, z.boolean())
    .default(true),
  beneficiaryName: optionalString,
  beneficiaryIdNumber: optionalString,
  beneficiarySex: sexSchema.nullable().optional(),

  aidTypeId: z.string().uuid('Seleccione un tipo de ayuda'),
  aidAreaId: z.string().uuid('Seleccione un área de ayuda'),
  aidAreaOther: optionalString,
  aidDescription: z.string().trim().min(2, 'La descripción es obligatoria'),
  aidStatus: aidStatusSchema.default('EN_EVALUACION'),
  aidProvider: optionalString,
  aidObservation: optionalString,
  amountUsd: decimalString,
  amountBs: decimalString,

  paymentRate: decimalString,
  paymentDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((v) => (v ? new Date(v) : undefined))
    .nullable(),
  paymentStatus: paymentStatusSchema.nullable().optional(),
});

function refineCensus(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
) {
  const beneficiarySameAsApplicant = data.beneficiarySameAsApplicant as boolean | undefined;
  if (beneficiarySameAsApplicant === false) {
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
    } else if (typeof data.beneficiaryIdNumber === 'string' && !cedulaRegex.test(data.beneficiaryIdNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['beneficiaryIdNumber'],
        message: 'Formato inválido. Ejemplos: V-27376369, E-1234567, N-12345678',
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
}

export const createCensusSchema = censusFormBaseSchema.superRefine(refineCensus);

export const updateCensusSchema = censusFormBaseSchema
  .partial()
  .superRefine(refineCensus);

export const listCensusQuerySchema = z.object({
  q: z.string().optional(),
  status: aidStatusSchema.optional(),
  aidAreaId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  createdById: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCensusInput = z.infer<typeof censusFormBaseSchema>;
export type UpdateCensusInput = z.infer<typeof updateCensusSchema>;
export type ListCensusQuery = z.infer<typeof listCensusQuerySchema>;
