import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Download, Loader2, Save, Upload, Trash2, Pencil, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentUploader, type UploadedFileMeta } from '@/components/forms/DocumentUploader';
import { EditCensusDialog } from '@/components/census/EditCensusDialog';
import { ConfirmPaymentDialog } from '@/components/census/ConfirmPaymentDialog';
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import {
  addMedicalDocuments,
  changeCensusStatus,
  deleteCensusDocument,
  downloadCensusDocument,
  downloadInitialCensusFile,
  getCensus,
} from '@/features/census/census.api';
import { listDocumentTypes } from '@/features/documentTypes/documentTypes.api';
import { formatDate, formatDateTime, formatCurrency, fileSize } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/client';
import { useAuthStore } from '@/features/auth/auth.store';
import { toast } from '@/components/ui/toast';

const STATUS_OPTIONS = [
  { value: 'EN_EVALUACION', label: 'En evaluación' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'ATENDIDO', label: 'Atendido' },
  { value: 'NO_PROCEDE', label: 'No procede' },
];

export function CensusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [newStatus, setNewStatus] = useState<string>('');
  const [observation, setObservation] = useState('');
  const [selectedDocTypeId, setSelectedDocTypeId] = useState('');
  const [pendingFiles, setPendingFiles] = useState<UploadedFileMeta[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);

  async function handleDownloadDoc(docId: string, fileName: string) {
    setDownloading(docId);
    try {
      await downloadCensusDocument(id!, docId, fileName);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo descargar el documento'));
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadInitial(kind: 'idDocument' | 'invoice', fileName: string) {
    setDownloading(kind);
    try {
      await downloadInitialCensusFile(id!, kind, fileName);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo descargar el archivo'));
    } finally {
      setDownloading(null);
    }
  }

  const { data: c, isLoading, error } = useQuery({
    queryKey: ['census', id],
    queryFn: () => getCensus(id!),
    enabled: !!id,
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['documentTypes', c?.aidType?.id],
    queryFn: () => listDocumentTypes(c?.aidType?.id),
    enabled: !!c?.aidType?.id,
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      changeCensusStatus(id!, {
        aidStatus: newStatus as 'ATENDIDO' | 'EN_PROCESO' | 'EN_EVALUACION' | 'NO_PROCEDE',
        aidObservation: observation || undefined,
      }),
    onSuccess: () => {
      toast.success('Estatus actualizado correctamente');
      setNewStatus('');
      setObservation('');
      void qc.invalidateQueries({ queryKey: ['census', id] });
      void qc.invalidateQueries({ queryKey: ['census'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudo actualizar el estatus')),
  });

  const uploadMutation = useMutation({
    mutationFn: (files: UploadedFileMeta[]) =>
      addMedicalDocuments(
        id!,
        files.map((f) => f.file),
        files.map((f) => f.documentTypeId ?? selectedDocTypeId),
      ),
    onSuccess: (docs) => {
      toast.success(`${docs.length} documento(s) adjuntado(s)`);
      setPendingFiles([]);
      void qc.invalidateQueries({ queryKey: ['census', id] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudieron subir los documentos')),
  });

  function setPendingType(idx: number, documentTypeId: string) {
    setPendingFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, documentTypeId } : f)));
  }

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => deleteCensusDocument(id!, docId),
    onSuccess: () => {
      toast.success('Documento eliminado');
      void qc.invalidateQueries({ queryKey: ['census', id] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudo eliminar el documento')),
  });

  if (isLoading) {
    return (
      <div className="container-page flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !c) {
    return (
      <div className="container-page">
        <p className="text-destructive">No se pudo cargar la solicitud.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/census/list"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Link>
        </Button>
      </div>
    );
  }

  const missingRequired = documentTypes
    .filter((d) => d.requiredForAidType)
    .filter((d) => (c?.documents.filter((doc) => doc.documentTypeId === d.id).length ?? 0) === 0);

  const initialDocs = [
    c.idDocumentPath
      ? { kind: 'idDocument' as const, label: c.idDocumentType ? `Cédula (${c.idDocumentType.name})` : 'Cédula del solicitante', path: c.idDocumentPath }
      : null,
    c.invoicePath
      ? { kind: 'invoice' as const, label: c.invoiceType ? `Factura (${c.invoiceType.name})` : 'Factura inicial', path: c.invoicePath }
      : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="container-page max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      <div className="flex flex-wrap items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-sans text-secondary font-semibold">{c.applicantName}</h1>
          <p className="text-sm text-muted-foreground font-mono">{c.applicantIdNumber}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {c.fileNumber && <Badge variant="secondary" className="font-mono">{c.fileNumber}</Badge>}
            {user?.role === 'ADMIN' && (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
          </div>
          <StatusBadge status={c.aidStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Información del solicitante</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Cédula" value={c.applicantIdNumber} />
            <Row label="Sexo" value={c.applicantSex === 'MASCULINO' ? 'Masculino' : 'Femenino'} />
            <Row label="Procedencia" value={c.originType?.name || '—'} />
            <Row label="Sede" value={c.site?.name || '—'} />
            <Row label="Procedencia externa" value={c.externalOrigin?.name || '—'} />
            <Row label="Detalle" value={c.originDetail || '—'} />
            <Row label="Teléfono" value={c.phone} />
            <Row label="Correo" value={c.email} />
            <Row label="Registrado por" value={c.createdBy.fullName} />
            <Row label="Fecha de registro" value={formatDateTime(c.registrationDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Información del beneficiario</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {c.beneficiarySameAsApplicant ? (
              <p className="text-muted-foreground">El beneficiario es el mismo solicitante.</p>
            ) : (
              <>
                <Row label="Nombre" value={c.beneficiaryName} />
                <Row label="Cédula" value={c.beneficiaryIdNumber} />
                <Row label="Sexo" value={c.beneficiarySex === 'MASCULINO' ? 'Masculino' : c.beneficiarySex === 'FEMENINO' ? 'Femenino' : '—'} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Información de la ayuda</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Tipo" value={c.aidType?.name || '—'} />
            <Row label="Área" value={c.aidArea?.name || '—'} />
            {c.aidAreaOther && <Row label="Otra especificación" value={c.aidAreaOther} />}
            <Row label="Descripción" value={c.aidDescription} />
            <Row label="Proveedor" value={c.aidProvider} />
            <Row label="Observación" value={c.aidObservation} />
            <Row label="Monto (USD)" value={c.amountUsd ? formatCurrency(c.amountUsd, 'USD') : null} />
            <Row label="Monto (Bs.)" value={c.amountBs ? formatCurrency(Number(c.amountBs), 'VES') : null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Cambiar estatus de la ayuda</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nuevo estatus</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Seleccione un estatus" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="observation">Observación (opcional)</Label>
              <Textarea
                id="observation"
                rows={3}
                placeholder="Detalle el motivo del cambio de estatus"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </div>
            <Button
              onClick={() => statusMutation.mutate()}
              disabled={!newStatus || statusMutation.isPending}
            >
              {statusMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar cambio
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Documentos
            </CardTitle>
            <CardDescription>
              Adjunte los documentos de la solicitud. Seleccione el tipo antes de subir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="w-full sm:w-64">
                <Label htmlFor="doc-type">Tipo de documento</Label>
                <Select value={selectedDocTypeId} onValueChange={setSelectedDocTypeId}>
                  <SelectTrigger id="doc-type"><SelectValue placeholder="Seleccione el tipo" /></SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}{d.requiredForAidType ? ' *' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <DocumentUploader
                  compact
                  label="Adjuntar"
                  multiple
                  value={pendingFiles}
                  onChange={setPendingFiles}
                  documentTypeId={selectedDocTypeId}
                />
              </div>
              <Button
                onClick={() => uploadMutation.mutate(pendingFiles)}
                disabled={!selectedDocTypeId || pendingFiles.length === 0 || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Subir {pendingFiles.length > 0 ? pendingFiles.length : ''}
              </Button>
            </div>

            {pendingFiles.length > 0 && (
              <ul className="space-y-2 border border-border rounded-md p-2">
                {pendingFiles.map((f, idx) => (
                  <li key={`${f.file.name}-${idx}`} className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{f.file.name}</span>
                    <Select value={f.documentTypeId ?? ''} onValueChange={(v) => setPendingType(idx, v)}>
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            )}

            {initialDocs.length > 0 && (
              <div className="space-y-2">
                {initialDocs.map((f) => (
                  <InitialFileRow
                    key={f.kind}
                    label={f.label}
                    path={f.path}
                    downloading={downloading === f.kind}
                    onDownload={() => handleDownloadInitial(f.kind, `${f.kind}-${c.applicantIdNumber}`)}
                  />
                ))}
              </div>
            )}

            {c.documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground text-xs">
                      <th className="py-1.5 pr-3 font-medium">Tipo</th>
                      <th className="py-1.5 pr-3 font-medium">Archivo</th>
                      <th className="py-1.5 pr-3 font-medium">Tamaño</th>
                      <th className="py-1.5 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.documents.map((doc) => (
                      <tr key={doc.id} className="border-b border-border/60">
                        <td className="py-1.5 pr-3">
                          {doc.documentType?.name ?? (doc.kind === 'MEDICAL' ? 'Documento' : 'Factura')}
                        </td>
                        <td className="py-1.5 pr-3">
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{doc.fileName}</span>
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{fileSize(doc.size)}</td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadDoc(doc.id, doc.fileName)} disabled={downloading === doc.id} title="Descargar">
                              {downloading === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" title="Eliminar" onClick={() => {
                              if (confirm(`¿Eliminar el documento "${doc.fileName}"?`)) deleteMutation.mutate(doc.id);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Aún no se han adjuntado documentos.</p>
            )}

            {missingRequired.length > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>
                  Faltan documentos obligatorios: {missingRequired.map((d) => d.name).join(', ')}.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Datos de pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Row label="Proveedor" value={c.aidProvider} />
              <Row label="Estatus de pago" value={c.paymentStatus ? <StatusBadge status={c.paymentStatus} /> : '—'} />
              <Row label="Tasa del día" value={c.paymentRate} />
              <Row label="Fecha de pago" value={c.paymentDate ? formatDate(c.paymentDate) : null} />
              <Row label="Monto (USD)" value={c.amountUsd ? formatCurrency(c.amountUsd, 'USD') : null} />
              <Row label="Monto (Bs.)" value={c.amountBs ? formatCurrency(Number(c.amountBs), 'VES') : null} />
              <div className="sm:col-span-2">
                <Row label="Observación" value={c.aidObservation} />
              </div>
            </div>
            {c.paymentStatus !== 'PAGADO' && (
              <Button onClick={() => setConfirmPaymentOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar pago
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Línea de tiempo</CardTitle>
            <CardDescription>
              Historial de cambios, subidas y descargas de documentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditTimeline entityId={c.id} />
          </CardContent>
        </Card>
      </div>

      <EditCensusDialog census={c} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmPaymentDialog censusId={c.id} open={confirmPaymentOpen} onOpenChange={setConfirmPaymentOpen} />
    </div>
  );
}

function InitialFileRow({
  label,
  path,
  downloading,
  onDownload,
}: {
  label: string;
  path: string;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border border-border rounded p-2 bg-muted/30">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{path}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onDownload}
        disabled={downloading}
        title="Descargar"
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || '—'}</span>
    </div>
  );
}
