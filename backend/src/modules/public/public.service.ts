import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middlewares/error.js';
import { cedulaRegex } from '../auth/auth.schema.js';

const FILE_NUMBER_REGEX = /^OAC-\d{4}-\d{4}$/i;

export async function consultarEstatus(q: string) {
  let census;

  if (FILE_NUMBER_REGEX.test(q)) {
    census = await prisma.census.findUnique({
      where: { fileNumber: q },
      include: {
        aidType: { select: { name: true } },
        aidArea: { select: { name: true } },
      },
    });
  } else if (cedulaRegex.test(q)) {
    census = await prisma.census.findFirst({
      where: { applicantIdNumber: q },
      include: {
        aidType: { select: { name: true } },
        aidArea: { select: { name: true } },
      },
      orderBy: { registrationDate: 'desc' },
    });
  } else {
    throw new AppError(
      400,
      'INVALID_QUERY',
      'Formato no válido. Use un N° de expediente (OAC-0001-2026) o una cédula (V-12345678).',
    );
  }

  if (!census) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'No se encontró una solicitud con ese número de expediente o cédula.',
    );
  }

  return {
    fileNumber: census.fileNumber,
    aidStatus: census.aidStatus,
    aidObservation: census.aidObservation,
    aidType: census.aidType?.name ?? null,
    aidArea: census.aidArea?.name ?? null,
    updatedAt: census.updatedAt,
  };
}
