import { z } from 'zod';

export const cedulaRegex = /^[VENE]-\d{6,8}$/i;

export const cedulaSchema = z
  .string()
  .trim()
  .regex(
    cedulaRegex,
    'Formato inválido. Ejemplos: V-27376369, E-1234567, N-12345678',
  );

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const sexSchema = z.enum(['MASCULINO', 'FEMENINO']);

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

export const optionalDecimal = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((v) => v === '' || /^\d+(\.\d{1,4})?$/.test(v), { message: 'Monto inválido' })
  .transform((v) => (v === '' ? undefined : v))
  .optional();

export const censusFormSchema = z
  .object({
    fileNumber: optionalString,
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
      } else if (!cedulaRegex.test(data.beneficiaryIdNumber)) {
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
  });

export type CensusFormValues = z.infer<typeof censusFormSchema>;
