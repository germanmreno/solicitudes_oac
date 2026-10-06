import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, ChevronLeft, ChevronRight, FileText, CalendarClock } from 'lucide-react';
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
import { EditDateDialog } from '@/components/census/EditDateDialog';
import { listCensus, type CensusListItem } from '@/features/census/census.api';
import { listAidTypes, listAidAreas, listOriginTypes } from '@/features/catalogs/catalogs.api';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUS_OPTIONS = [
  { value: 'EN_EVALUACION', label: 'En evaluación' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'ATENDIDO', label: 'Atendido' },
  { value: 'NO_PROCEDE', label: 'No procede' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'PAGADO', label: 'Pagado' },
  { value: 'ANULADO', label: 'Anulado' },
];

export function CensusListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [aidTypeId, setAidTypeId] = useState('');
  const [aidAreaId, setAidAreaId] = useState('');
  const [originTypeId, setOriginTypeId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'registrationDate', direction: 'desc' });
  const [dateEditing, setDateEditing] = useState<CensusListItem | null>(null);

  const params = {
    q: q || undefined,
    status: status || undefined,
    aidTypeId: aidTypeId || undefined,
    aidAreaId: aidAreaId || undefined,
    originTypeId: originTypeId || undefined,
    paymentStatus: paymentStatus || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: pageSize,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['census', params],
    queryFn: () => listCensus(params),
  });

  const { data: aidTypes = [] } = useQuery({
    queryKey: ['aid-types'],
    queryFn: listAidTypes,
    staleTime: 1000 * 60 * 60,
  });

  const { data: aidAreas = [] } = useQuery({
    queryKey: ['aid-areas', aidTypeId],
    queryFn: () => listAidAreas(aidTypeId || undefined),
    staleTime: 1000 * 60 * 60,
  });

  const { data: originTypes = [] } = useQuery({
    queryKey: ['origin-types'],
    queryFn: listOriginTypes,
    staleTime: 1000 * 60 * 60,
  });

  const hasFilters = Boolean(
    q || status || aidTypeId || aidAreaId || originTypeId || paymentStatus || from || to,
  );

  function clearFilters() {
    setQ('');
    setStatus('');
    setAidTypeId('');
    setAidAreaId('');
    setOriginTypeId('');
    setPaymentStatus('');
    setFrom('');
    setTo('');
    setPage(1);
  }

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
      header: 'Documentos',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-muted-foreground text-xs font-medium tabular-nums">{row._count?.documents ?? 0}</span>
          <span
            className="inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-medium"
            title="Cédula cargada"
            aria-label={row.hasCedula ? 'Cédula cargada' : 'Sin cédula'}
          >
            <span aria-hidden className={row.hasCedula ? 'text-primary' : 'text-muted-foreground'}>
              {row.hasCedula ? '✓' : '·'}
            </span>
            <span className={row.hasCedula ? 'text-foreground' : 'text-muted-foreground'}>C.I.</span>
          </span>
          <span
            className="inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-medium"
            title="Carta de solicitud cargada"
            aria-label={row.hasCarta ? 'Carta cargada' : 'Sin carta'}
          >
            <span aria-hidden className={row.hasCarta ? 'text-primary' : 'text-muted-foreground'}>
              {row.hasCarta ? '✓' : '·'}
            </span>
            <span className={row.hasCarta ? 'text-foreground' : 'text-muted-foreground'}>Carta</span>
          </span>
        </div>
      ),
      sortBy: (row) => row._count?.documents ?? 0,
      sortAscLabel: 'Documentos',
      align: 'right',
    },
    {
      id: 'registrationDate',
      header: 'Fecha',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <time dateTime={row.registrationDate}>{formatDate(row.registrationDate)}</time>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            aria-label={`Editar fecha de registro de ${row.applicantName}`}
            title="Editar fecha de registro"
            onClick={(e) => { e.stopPropagation(); setDateEditing(row); }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CalendarClock className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      sortBy: (row) => new Date(row.registrationDate).getTime(),
      sortAscLabel: 'Fecha de registro',
    },
  ];

  return (
    <div className="container-page">
      <header className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-serif text-secondary">Solicitudes registradas</h1>
          <p className="text-sm text-muted-foreground">Todas las solicitudes del sistema.</p>
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
        <div role="search" aria-label="Filtros de búsqueda" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div className="relative sm:col-span-2 lg:col-span-3">
            <label htmlFor="q-search" className="sr-only">Buscar</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              id="q-search"
              placeholder="Buscar por nombre, cédula, N° de expediente o descripción"
              className="pl-10"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              aria-label="Buscar solicitudes"
            />
          </div>

          <div>
            <label htmlFor="status-filter" className="sr-only">Estatus</label>
            <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger id="status-filter" aria-label="Filtrar por estatus">
                <SelectValue placeholder="Estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estatus</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="aid-type-filter" className="sr-only">Tipo de ayuda</label>
            <Select
              value={aidTypeId || 'all'}
              onValueChange={(v) => { setAidTypeId(v === 'all' ? '' : v); setAidAreaId(''); setPage(1); }}
            >
              <SelectTrigger id="aid-type-filter" aria-label="Filtrar por tipo de ayuda">
                <SelectValue placeholder="Tipo de ayuda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {aidTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="aid-area-filter" className="sr-only">Área de ayuda</label>
            <Select
              value={aidAreaId || 'all'}
              onValueChange={(v) => { setAidAreaId(v === 'all' ? '' : v); setPage(1); }}
            >
              <SelectTrigger id="aid-area-filter" aria-label="Filtrar por área de ayuda">
                <SelectValue placeholder="Área de ayuda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {aidAreas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="origin-type-filter" className="sr-only">Procedencia</label>
            <Select
              value={originTypeId || 'all'}
              onValueChange={(v) => { setOriginTypeId(v === 'all' ? '' : v); setPage(1); }}
            >
              <SelectTrigger id="origin-type-filter" aria-label="Filtrar por tipo de procedencia">
                <SelectValue placeholder="Procedencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las procedencias</SelectItem>
                {originTypes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="payment-status-filter" className="sr-only">Estatus de pago</label>
            <Select
              value={paymentStatus || 'all'}
              onValueChange={(v) => { setPaymentStatus(v === 'all' ? '' : v); setPage(1); }}
            >
              <SelectTrigger id="payment-status-filter" aria-label="Filtrar por estatus de pago">
                <SelectValue placeholder="Estatus de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los pagos</SelectItem>
                {PAYMENT_STATUS_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="from-filter" className="block text-xs text-muted-foreground mb-1">Desde</label>
            <Input
              id="from-filter"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              aria-label="Fecha de registro desde"
            />
          </div>

          <div>
            <label htmlFor="to-filter" className="block text-xs text-muted-foreground mb-1">Hasta</label>
            <Input
              id="to-filter"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              aria-label="Fecha de registro hasta"
            />
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} disabled={!hasFilters} className="w-full">
              Limpiar filtros
            </Button>
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
            <p>{hasFilters ? 'No se encontraron solicitudes con los filtros aplicados.' : 'No hay solicitudes registradas.'}</p>
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

      <EditDateDialog
        census={dateEditing}
        open={!!dateEditing}
        onOpenChange={(o) => { if (!o) setDateEditing(null); }}
      />
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
