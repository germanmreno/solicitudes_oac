import { z } from 'zod';

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
  fullName: z.string().trim().min(3, 'El nombre completo es obligatorio'),
  role: z.enum(['ADMIN', 'OPERATOR']).default('OPERATOR'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(3).optional(),
  role: z.enum(['ADMIN', 'OPERATOR']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
