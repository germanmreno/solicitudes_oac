import { z } from 'zod';

export const catalogNameSchema = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres');

export const createOriginTypeSchema = z.object({
  name: catalogNameSchema,
  requiresSite: z.boolean().default(false),
});

export const createAidTypeSchema = z.object({
  name: catalogNameSchema,
});

export const createAidAreaSchema = z.object({
  aidTypeId: z.string().uuid('Debe seleccionar un tipo de ayuda'),
  name: catalogNameSchema,
  requiresDetail: z.boolean().default(false),
});

export const updateCatalogSchema = z.object({
  name: catalogNameSchema.optional(),
  active: z.boolean().optional(),
  requiresSite: z.boolean().optional(),
  requiresDetail: z.boolean().optional(),
});

export type CreateOriginTypeInput = z.infer<typeof createOriginTypeSchema>;
export type CreateAidTypeInput = z.infer<typeof createAidTypeSchema>;
export type CreateAidAreaInput = z.infer<typeof createAidAreaSchema>;
export type UpdateCatalogInput = z.infer<typeof updateCatalogSchema>;
