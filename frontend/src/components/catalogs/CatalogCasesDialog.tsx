import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  listCatalogCases,
  type CatalogItem,
  type CatalogKind,
} from '@/features/catalogs/catalogs.api';
import { formatDate } from '@/lib/utils';

const KIND_LABEL: Record<CatalogKind, string> = {
  'origin-types': 'tipo de procedencia',
  'sites': 'sede',
  'external-origins': 'procedencia externa',
  'aid-types': 'tipo de ayuda',
  'aid-areas': 'área de ayuda',
};

export function CatalogCasesDialog({
  kind,
  item,
  open,
  onOpenChange,
}: {
  kind: CatalogKind;
  item: CatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['catalog-cases', kind, item?.id],
    queryFn: () => listCatalogCases(kind, item!.id),
    enabled: open && !!item,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Casos en «{item?.name ?? ''}»</DialogTitle>
          <DialogDescription>
            Solicitudes clasificadas con este {KIND_LABEL[kind]}. Úselas para detectar duplicados antes de
            eliminarlo: no se puede borrar mientras tenga casos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No hay casos con esta clasificación.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {total} caso{total === 1 ? '' : 's'}
              {total > items.length ? ` (mostrando ${items.length})` : ''}.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° expediente</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead className="text-right">Ver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.fileNumber || '—'}</TableCell>
                      <TableCell className="font-medium">{c.applicantName}</TableCell>
                      <TableCell className="font-mono text-xs">{c.applicantIdNumber}</TableCell>
                      <TableCell>{formatDate(c.registrationDate)}</TableCell>
                      <TableCell><StatusBadge status={c.aidStatus} /></TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/census/${c.id}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                          aria-label={`Ver la solicitud de ${c.applicantName}`}
                        >
                          Abrir <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
