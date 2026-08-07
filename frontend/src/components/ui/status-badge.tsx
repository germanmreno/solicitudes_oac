import { cn } from '@/lib/utils';

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const colors: Record<string, string> = {
    ATENDIDO: 'bg-green-100 text-green-800 border-green-200',
    EN_PROCESO: 'bg-amber-100 text-amber-800 border-amber-200',
    EN_EVALUACION: 'bg-blue-100 text-blue-800 border-blue-200',
    NO_PROCEDE: 'bg-red-100 text-red-800 border-red-200',
    PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PAGADO: 'bg-green-100 text-green-800 border-green-200',
    ANULADO: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  const labels: Record<string, string> = {
    ATENDIDO: 'Atendido',
    EN_PROCESO: 'En proceso',
    EN_EVALUACION: 'En evaluación',
    NO_PROCEDE: 'No procede',
    PENDIENTE: 'Pendiente',
    PAGADO: 'Pagado',
    ANULADO: 'Anulado',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        colors[status] || 'bg-gray-100 text-gray-800 border-gray-200',
        className,
      )}
    >
      {labels[status] || status}
    </span>
  );
}
