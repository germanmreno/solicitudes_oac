export const AID_STATUS_LABELS: Record<string, string> = {
  ATENDIDO: 'Atendido',
  EN_PROCESO: 'En proceso',
  EN_EVALUACION: 'En evaluación',
  NO_PROCEDE: 'No procede',
};

export const AID_STATUS_COLORS: Record<string, string> = {
  ATENDIDO: 'bg-green-100 text-green-800 border-green-200',
  EN_PROCESO: 'bg-amber-100 text-amber-800 border-amber-200',
  EN_EVALUACION: 'bg-blue-100 text-blue-800 border-blue-200',
  NO_PROCEDE: 'bg-red-100 text-red-800 border-red-200',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
};

export const SEX_LABELS: Record<string, string> = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  NO_APLICA: 'No aplica',
  'N/A': 'No aplica',
  'N/P': 'No posee',
};
