import { z } from 'zod';

export const cedulaRegex = /^[VENE]-\d{6,8}$/i;

export const SENTINEL_ID_NUMBERS = ['N/A', 'N/P'] as const;
export const idNumberRegex = /^([VENE]-\d{6,8}|N\/A|N\/P)$/i;
export const isSentinelIdNumber = (value: string): boolean =>
  SENTINEL_ID_NUMBERS.includes(value.trim().toUpperCase() as (typeof SENTINEL_ID_NUMBERS)[number]);

export const cedulaSchema = z
  .string()
  .trim()
  .regex(
    idNumberRegex,
    'Formato inválido. Use V-27376369, E-1234567, N-12345678, N/A (no aplica) o N/P (no posee)',
  );

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Debe indicar la contraseña actual'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Debe confirmar la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'La confirmación no coincide con la nueva contraseña',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
