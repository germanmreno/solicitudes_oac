import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Download, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadImportTemplate, importCensusCsv, type ImportResult } from '@/features/import/import.api';
import { getErrorMessage } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';

export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => importCensusCsv(file),
    onSuccess: (r) => setResult(r),
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudo procesar el archivo')),
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('El archivo debe ser un CSV');
      return;
    }
    setResult(null);
    mutation.mutate(file);
  }

  async function exportErrors() {
    if (!result || result.errors.length === 0) return;
    const { utils, writeFile } = await import('xlsx');
    const rows = result.errors.map((e) => ({
      'Fila CSV': e.row,
      'N° expediente': e.fileNumber ?? '',
      Solicitante: e.applicantName ?? '',
      Cédula: e.applicantIdNumber ?? '',
      Error: e.message,
    }));
    const ws = utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 9 }, { wch: 17 }, { wch: 34 }, { wch: 17 }, { wch: 70 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Errores');
    writeFile(wb, 'errores_importacion.xlsx');
  }

  return (
    <div className="container-page max-w-3xl">
      <h1 className="text-2xl font-serif text-secondary mb-1">Carga masiva de solicitudes</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Importe un CSV con los casos. Use la plantilla para asegurar los encabezados correctos.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Archivo CSV
          </CardTitle>
          <CardDescription>
            Se procesará fila por fila; las filas con errores no bloquean el resto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => inputRef.current?.click()} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Seleccionar CSV
            </Button>
            <Button variant="outline" onClick={() => void downloadImportTemplate()}>
              <Download className="h-4 w-4 mr-2" /> Descargar plantilla
            </Button>
          </div>

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{result.successCount} importadas</p>
                    <p className="text-xs text-emerald-700">Solicitudes creadas correctamente</p>
                  </div>
                </div>
                <div className="rounded-md bg-rose-50 border border-rose-200 p-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                  <div>
                    <p className="text-sm font-semibold text-rose-800">{result.errorCount} con error</p>
                    <p className="text-xs text-rose-700">Revise la tabla de errores</p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fila</TableHead>
                        <TableHead>N° expediente</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.slice(0, 100).map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{e.row}</TableCell>
                          <TableCell className="font-mono text-xs">{e.fileNumber ?? '—'}</TableCell>
                          <TableCell className="text-sm">{e.applicantName ?? '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{e.applicantIdNumber ?? '—'}</TableCell>
                          <TableCell className="text-sm">{e.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {result.errors.length > 100 && (
                    <p className="text-xs text-muted-foreground">
                      Mostrando 100 de {result.errors.length}. Use "Descargar errores" para el listado completo.
                    </p>
                  )}
                  <Button variant="outline" size="sm" onClick={() => void exportErrors()}>
                    <Download className="h-4 w-4 mr-2" /> Descargar errores (Excel)
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
