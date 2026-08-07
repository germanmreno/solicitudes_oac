import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn, type DataTableSort } from '@/components/ui/DataTable';
import { listCensus, type CensusListItem } from '@/features/census/census.api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/auth.store';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function CensusListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'registrationDate', direction: 'desc' });

  const params = {
    q: q || undefined,
    status: status || undefined,
    page,
    limit: pageSize,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['census', params],
    queryFn: () => listCensus(params),
  });

  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  const items = data?.items ?? [];
  const sortedItems = sortItems(items, sort);

  const columns: DataTableColumn<CensusListItem>[] = [
    {
      id: 'fileNumber',
      header: 'N° expediente',
      cell: (row) => (
        <span className="font-mono text-xs">{row.fileNumber || '—'}</span>
      ),
      sortBy: (row) => row.fileNumber,
      sortAscLabel: 'N° de expediente',
    },
    {
      id: 'applicantName',
      header: 'Solicitante',
      cell: (row) => <span className="font-medium">{row.applicantName}</span>,
      sortBy: (row) => row.applicantName,
      sortAscLabel: 'Solicitante',
    },
    {
      id: 'applicantIdNumber',
      header: 'Cédula',
      cell: (row) => <span className="font-mono text-xs">{row.applicantIdNumber}</span>,
      sortBy: (row) => row.applicantIdNumber,
      sortAscLabel: 'Cédula',
    },
    {
      id: 'aidArea',
      header: 'Área de ayuda',
      cell: (row) => <Badge variant="muted">{row.aidArea?.name || '—'}</Badge>,
      sortBy: () => null,
    },
    {
      id: 'aidStatus',
      header: 'Estatus',
      cell: (row) => <StatusBadge status={row.aidStatus} />,
      sortBy: (row) => row.aidStatus,
      sortAscLabel: 'Estatus',
    },
    {
      id: 'documents',
      header: 'Docs',
      cell: (row) => <span className="text-muted-foreground text-xs">{row._count?.documents ?? 0}</span>,
      sortBy: (row) => row._count?.documents ?? 0,
      sortAscLabel: 'Documentos',
      align: 'right',
    },
    {
      id: 'registrationDate',
      header: 'Fecha',
      cell: (row) => <time dateTime={row.registrationDate}>{formatDate(row.registrationDate)}</time>,
      sortBy: (row) => new Date(row.registrationDate).getTime(),
      sortAscLabel: 'Fecha de registro',
    },
  ];

  return (
    <div className="container-page">
      <header className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-serif text-secondary">Solicitudes registradas</h1>
          <p className="text-sm text-muted-foreground">
            {user?.role === 'ADMIN' ? 'Todas las solicitudes del sistema.' : 'Solicitudes que usted ha registrado.'}
          </p>
        </div>
        <div className="ml-auto">
          <Button asChild>
            <Link to="/census/new">
              <Plus className="h-4 w-4 mr-1" /> Nueva solicitud
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <div role="search" aria-label="Filtros de búsqueda" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="relative sm:col-span-2">
            <label htmlFor="q-search" className="sr-only">Buscar</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              id="q-search"
              placeholder="Buscar por nombre, cédula o N° de expediente"
              className="pl-10"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              aria-label="Buscar solicitudes"
            />
          </div>
          <div>
            <label htmlFor="status-filter" className="sr-only">Filtrar por estatus</label>
            <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Todos los estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estatus</SelectItem>
                <SelectItem value="EN_EVALUACION">En evaluación</SelectItem>
                <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                <SelectItem value="ATENDIDO">Atendido</SelectItem>
                <SelectItem value="NO_PROCEDE">No procede</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {isFetching ? 'Cargando solicitudes…' : `${total} solicitudes encontradas`}
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <span>Cargando solicitudes…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <FileText className="h-10 w-10 mx-auto opacity-50" aria-hidden />
            <p>{q || status ? 'No se encontraron solicitudes con los filtros aplicados.' : 'No hay solicitudes registradas.'}</p>
            <Button asChild>
              <Link to="/census/new">Crear la primera</Link>
            </Button>
          </div>
        ) : (
          <>
            <DataTable<CensusListItem>
              items={sortedItems}
              columns={columns}
              rowKey={(row) => row.id}
              onRowClick={(row) => navigate(`/census/${row.id}`)}
              ariaLabel="Lista de solicitudes registradas"
              caption="Solicitudes registradas en el sistema"
              sort={sort}
              onSortChange={(s) => setSort(s)}
              emptyMessage="Sin solicitudes."
            />
            <nav
              className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm"
              aria-label="Paginación de solicitudes"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  Mostrando <strong className="text-foreground">{items.length}</strong> de{' '}
                  <strong className="text-foreground">{total}</strong> resultados
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="h-8 w-auto" aria-label="Tamaño de página">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} por página</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2" role="group" aria-label="Navegación de páginas">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-muted-foreground px-2" aria-live="polite">
                  Página {page} de {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Página siguiente"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          </>
        )}
      </Card>
    </div>
  );
}

function sortItems(items: CensusListItem[], sort: DataTableSort): CensusListItem[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  const col = sort.columnId;
  return [...items].sort((a, b) => {
    let av: unknown;
    let bv: unknown;
    if (col === 'fileNumber') { av = a.fileNumber; bv = b.fileNumber; }
    else if (col === 'applicantName') { av = a.applicantName; bv = b.applicantName; }
    else if (col === 'applicantIdNumber') { av = a.applicantIdNumber; bv = b.applicantIdNumber; }
    else if (col === 'aidStatus') { av = a.aidStatus; bv = b.aidStatus; }
    else if (col === 'documents') { av = a._count?.documents ?? 0; bv = b._count?.documents ?? 0; }
    else if (col === 'registrationDate') { av = new Date(a.registrationDate).getTime(); bv = new Date(b.registrationDate).getTime(); }
    else { return 0; }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'es') * dir;
  });
}
