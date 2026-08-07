import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FilePlus,
  FileX,
  Edit3,
  ArrowRightLeft,
  Plus,
  LogIn,
  LogOut,
  UserCog,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { listAudit, type AuditItem, type AuditResponse } from '@/features/audit/audit.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AuditTimelineProps {
  entityId: string;
  className?: string;
}

const ACTION_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  CREATE_CENSUS:        { label: 'Solicitud creada',       icon: Plus,           tone: 'bg-emerald-100 text-emerald-700' },
  UPDATE_CENSUS:        { label: 'Solicitud actualizada',  icon: Edit3,          tone: 'bg-blue-100 text-blue-700' },
  CHANGE_STATUS:        { label: 'Estatus cambiado',       icon: ArrowRightLeft,  tone: 'bg-amber-100 text-amber-700' },
  UPDATE_PAYMENT:       { label: 'Pago actualizado',       icon: Edit3,          tone: 'bg-blue-100 text-blue-700' },
  UPLOAD_DOCUMENT:      { label: 'Documento adjunto',      icon: FilePlus,       tone: 'bg-violet-100 text-violet-700' },
  DELETE_DOCUMENT:      { label: 'Documento eliminado',    icon: FileX,          tone: 'bg-rose-100 text-rose-700' },
  LOGIN:                { label: 'Inicio de sesión',       icon: LogIn,          tone: 'bg-slate-100 text-slate-700' },
  LOGOUT:               { label: 'Cierre de sesión',       icon: LogOut,         tone: 'bg-slate-100 text-slate-700' },
  CREATE_USER:          { label: 'Usuario creado',         icon: UserCog,        tone: 'bg-emerald-100 text-emerald-700' },
  UPDATE_USER:          { label: 'Usuario actualizado',    icon: UserCog,        tone: 'bg-blue-100 text-blue-700' },
  CREATE_CATALOG_ITEM:  { label: 'Catálogo creado',       icon: Tag,            tone: 'bg-emerald-100 text-emerald-700' },
  UPDATE_CATALOG_ITEM:  { label: 'Catálogo actualizado',   icon: Tag,            tone: 'bg-blue-100 text-blue-700' },
};

function describeAction(item: AuditItem): string {
  const meta = ACTION_META[item.action];
  const base = meta?.label ?? item.action;
  const payload = (item.payload ?? {}) as Record<string, unknown>;

  if (item.action === 'CHANGE_STATUS' && payload.from && payload.to) {
    return `${base}: ${payload.from} → ${payload.to}`;
  }
  if (item.action === 'UPLOAD_DOCUMENT' && typeof payload.fileName === 'string') {
    return `${base}: ${payload.fileName}`;
  }
  if (item.action === 'DELETE_DOCUMENT' && typeof payload.fileName === 'string') {
    return `${base}: ${payload.fileName}`;
  }
  if (item.action === 'CREATE_CENSUS' && typeof payload.fileNumber === 'string') {
    return `${base}: N° ${payload.fileNumber}`;
  }
  if (item.action === 'UPDATE_CENSUS' && payload.fields) {
    const fields = Object.keys(payload.fields as Record<string, unknown>);
    return `${base} (${fields.length} campo${fields.length === 1 ? '' : 's'})`;
  }
  if (item.action === 'UPDATE_PAYMENT' && payload.fields) {
    const fields = Object.keys(payload.fields as Record<string, unknown>);
    return `${base} (${fields.length} campo${fields.length === 1 ? '' : 's'})`;
  }
  return base;
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'hace instantes';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return date.toLocaleDateString('es');
}

export function AuditTimeline({ entityId, className }: AuditTimelineProps) {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const limit = 50;

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ['audit', entityId, page, limit],
    queryFn: () => listAudit({ entity: 'Census', entityId, page, limit }),
  });

  const items = data?.items ?? [];
  const filtered = useMemo(
    () => (actionFilter === 'all' ? items : items.filter((i) => i.action === actionFilter)),
    [items, actionFilter],
  );

  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  const actionsAvailable = useMemo(
    () => Array.from(new Set(items.map((i) => i.action))),
    [items],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-auto h-9" aria-label="Filtrar por tipo de evento">
            <SelectValue placeholder="Todos los eventos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los eventos</SelectItem>
            {actionsAvailable.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_META[a]?.label ?? a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground ml-auto" aria-live="polite">
          {total} evento{total === 1 ? '' : 's'}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center" role="status" aria-live="polite">
          Cargando eventos…
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No hay eventos {actionFilter === 'all' ? '' : 'de este tipo'}.
        </p>
      ) : (
        <ol className="relative space-y-3 pl-8 border-l-2 border-border" aria-label="Línea de tiempo de la solicitud">
          {filtered.map((item) => {
            const meta = ACTION_META[item.action] ?? {
              label: item.action,
              icon: Edit3,
              tone: 'bg-slate-100 text-slate-700',
            };
            const Icon = meta.icon;
            return (
              <li key={item.id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[42px] top-1 h-7 w-7 rounded-full flex items-center justify-center',
                    meta.tone,
                  )}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <article className="rounded-md border border-border bg-white px-3 py-2">
                  <header className="flex flex-wrap items-baseline gap-2">
                    <h4 className="text-sm font-medium text-secondary">{describeAction(item)}</h4>
                    <span className="text-xs text-muted-foreground" title={formatDateTime(item.createdAt)}>
                      <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                    </span>
                    {!item.user && (
                      <Badge variant="muted" className="text-[10px]">Sistema</Badge>
                    )}
                  </header>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.user ? (
                      <>
                        Por <strong className="text-foreground">{item.user.fullName}</strong>{' '}
                        <span className="text-muted-foreground">@{item.user.username}</span>
                      </>
                    ) : (
                      'Generado automáticamente'
                    )}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-end gap-2 pt-2" aria-label="Paginación de la línea de tiempo">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </nav>
      )}
    </div>
  );
}
