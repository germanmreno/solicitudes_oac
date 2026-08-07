import { z } from 'zod';

export const documentTypeNameSchema = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres');
export const documentTypeCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[A-Z0-9_]+$/, 'Solo mayúsculas, números y guion bajo');

export const createDocumentTypeSchema = z.object({
  name: documentTypeNameSchema,
  code: documentTypeCodeSchema,
  requiredByDefault: z.boolean().default(false),
});

export const linkDocumentTypeSchema = z.object({
  aidTypeId: z.string().uuid('Seleccione un tipo de ayuda'),
  documentTypeId: z.string().uuid('Seleccione un tipo de documento'),
  required: z.boolean().default(true),
});

export const updateDocumentTypeSchema = z.object({
  name: documentTypeNameSchema.optional(),
  active: z.boolean().optional(),
  requiredByDefault: z.boolean().optional(),
});

export const updateLinkSchema = z.object({
  required: z.boolean(),
});

export type CreateDocumentTypeInput = z.infer<typeof createDocumentTypeSchema>;
export type LinkDocumentTypeInput = z.infer<typeof linkDocumentTypeSchema>;
export type UpdateDocumentTypeInput = z.infer<typeof updateDocumentTypeSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
