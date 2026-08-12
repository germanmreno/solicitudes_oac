import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Loader2, FileQuestion } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { consultarEstatus } from '@/features/consulta/consulta.api';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils';

export function ConsultaPage() {
  const [q, setQ] = useState('');

  const mutation = useMutation({
    mutationFn: () => consultarEstatus(q.trim()),
  });

  const resultado = mutation.data;
  const error = mutation.isError ? mutation.error : null;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <div className="flex-1 flex items-start justify-center p-4 bg-muted/30">
        <div className="w-full max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>Consulta de estatus</CardTitle>
              <CardDescription>
                Ingrese su N° de expediente o cédula para conocer el estado de su solicitud.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim().length >= 2) mutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="q">N° de expediente o cédula</Label>
                  <Input
                    id="q"
                    placeholder="Ej: OAC-0001-2026 o V-12345678"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={mutation.isPending || q.trim().length < 2}>
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Consultar
                </Button>
              </form>

              <div aria-live="polite" className="mt-5">
                {mutation.isPending && (
                  <p className="text-sm text-muted-foreground text-center" role="status">
                    Consultando…
                  </p>
                )}

                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-destructive text-sm">
                    {getErrorMessage(error, 'No se pudo realizar la consulta.')}
                  </div>
                )}

                {resultado && (
                  <div className="rounded-md border border-border bg-white p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{resultado.fileNumber}</span>
                      <StatusBadge status={resultado.aidStatus} />
                    </div>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Tipo de ayuda</dt>
                        <dd className="font-medium">{resultado.aidType || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Área</dt>
                        <dd className="font-medium">{resultado.aidArea || '—'}</dd>
                      </div>
                      {resultado.aidObservation && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Observación</dt>
                          <dd className="font-medium text-right">{resultado.aidObservation}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Última actualización</dt>
                        <dd className="font-medium">{formatDateTime(resultado.updatedAt)}</dd>
                      </div>
                    </dl>
                    {!resultado.aidObservation && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileQuestion className="h-3 w-3" />
                        Esta solicitud no posee observaciones adicionales.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm mt-6">
            <Link to="/login" className="text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-4">
            © 2026 Corporación Venezolana de Minería · Ministerio del Poder Popular de Desarrollo Minero
            Ecológico e Industrias Básicas
          </p>
        </div>
      </div>
    </div>
  );
}
