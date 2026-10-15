import { z } from 'zod';

export const consultaQuerySchema = z.object({
  q: z.string().trim().min(2, 'Indique el número de expediente, la cédula o el SITUR'),
});
