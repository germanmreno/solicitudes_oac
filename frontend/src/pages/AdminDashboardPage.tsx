import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listCensus } from '@/features/census/census.api';
import { listAidTypes, listAidAreas } from '@/features/catalogs/catalogs.api';
import { formatDate } from '@/lib/utils';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [aidTypeId, setAidTypeId] = useState('');
  const [aidAreaId, setAidAreaId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    q: q || undefined,
    status: status || undefined,
    aidAreaId: aidAreaId || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-census', params],
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
    enabled: !!aidTypeId,
    staleTime: 1000 * 60 * 60,
  });

  function clearFilters() {
    setQ(''); setStatus(''); setAidTypeId(''); setAidAreaId(''); setFrom(''); setTo(''); setPage(1);
  }

  return (
    <div className="container-page">
      <h1 className="text-2xl font-serif text-secondary mb-1">Panel de administración</h1>
      <p className="text-sm text-muted-foreground mb-4">Vista global de todas las solicitudes.</p>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula, N° de expediente o descripción"
              className="pl-10"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Estatus" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="EN_EVALUACION">En evaluación</SelectItem>
              <SelectItem value="EN_PROCESO">En proceso</SelectItem>
              <SelectItem value="ATENDIDO">Atendido</SelectItem>
              <SelectItem value="NO_PROCEDE">No procede</SelectItem>
            </SelectContent>
          </Select>
          <Select value={aidTypeId || 'all'} onValueChange={(v) => { setAidTypeId(v === 'all' ? '' : v); setAidAreaId(''); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Tipo de ayuda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {aidTypes.map((at) => (
                <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {aidTypeId && (
            <Select value={aidAreaId || 'all'} onValueChange={(v) => { setAidAreaId(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Área de ayuda" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {aidAreas.map((aa) => (
                  <SelectItem key={aa.id} value={aa.id}>{aa.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° exp.</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Tipo de ayuda</TableHead>
                  <TableHead>Área de ayuda</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/census/${c.id}`)}>
                    <TableCell className="font-mono text-xs">{c.fileNumber || '—'}</TableCell>
                    <TableCell className="font-medium">{c.applicantName}</TableCell>
                    <TableCell>{c.applicantIdNumber}</TableCell>
                    <TableCell>{c.aidType?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{c.aidArea?.name || '—'}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={c.aidStatus} /></TableCell>
                    <TableCell className="text-xs">{c.createdBy.fullName}</TableCell>
                    <TableCell>{formatDate(c.registrationDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-muted-foreground">
                {data.items.length} de {data.meta.total} resultados
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </div>
            </div>
          </>
        ) : (
          <p className="py-12 text-center text-muted-foreground">No se encontraron solicitudes con los filtros aplicados.</p>
        )}
      </Card>
    </div>
  );
}
