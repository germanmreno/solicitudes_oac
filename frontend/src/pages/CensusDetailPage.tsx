import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Download, Loader2, Save, Upload, Trash2, Pencil, X, FilePlus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentUploader, type UploadedFileMeta } from '@/components/forms/DocumentUploader';
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import {
  changeCensusStatus,
  deleteCensusDocument,
  addMedicalDocuments,
  downloadCensusDocument,
  downloadInitialCensusFile,
  getCensus,
  updatePayment,
} from '@/features/census/census.api';
import { listDocumentTypes } from '@/features/documentTypes/documentTypes.api';
import { formatDate, formatDateTime, formatCurrency, fileSize } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';

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

export function CensusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>('');
  const [observation, setObservation] = useState('');
  const [pendingByType, setPendingByType] = useState<Record<string, UploadedFileMeta[]>>({});
  const [downloading, setDownloading] = useState<string | null>(null);

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

  const uploadByType = useMutation({
    mutationFn: ({ documentTypeId, files }: { documentTypeId: string; files: UploadedFileMeta[] }) =>
      addMedicalDocuments(
        id!,
        files.map((f) => f.file),
        files.map((f) => f.documentTypeId ?? documentTypeId),
      ),
    onSuccess: (docs, vars) => {
      toast.success(`${docs.length} documento(s) adjuntado(s)`);
      setPendingByType((prev) => ({ ...prev, [vars.documentTypeId]: [] }));
      void qc.invalidateQueries({ queryKey: ['census', id] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudieron subir los documentos')),
  });

  function uploadByTypeMutation(documentTypeId: string, files: UploadedFileMeta[]) {
    return uploadByType.mutate({ documentTypeId, files });
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
          {c.fileNumber && <Badge variant="secondary" className="font-mono">{c.fileNumber}</Badge>}
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
              <FilePlus className="h-5 w-5 text-primary" /> Documentos por tipo
            </CardTitle>
            <CardDescription>
              Suba los documentos requeridos para el tipo de ayuda seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {documentTypes.length === 0 ? (
              <p className="text-muted-foreground">Cargando documentos…</p>
            ) : (
              documentTypes.map((d) => {
                const docsForType = c?.documents.filter(
                  (doc) => doc.documentTypeId === d.id,
                );
                const pending = pendingByType[d.id] ?? [];
                return (
                  <div key={d.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-secondary flex items-center gap-2">
                        {d.name}
                        {d.requiredForAidType && (
                          <Badge variant="muted" className="text-[10px]">Obligatorio</Badge>
                        )}
                        {d.requiredByDefault && !d.requiredForAidType && (
                          <Badge variant="muted" className="text-[10px]">Requerido</Badge>
                        )}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {docsForType?.length ?? 0} adjunto(s)
                      </span>
                    </div>
                    {docsForType && docsForType.length > 0 ? (
                      <ul className="space-y-2 mb-3">
                        {docsForType.map((doc) => (
                          <DocumentRow
                            key={doc.id}
                            doc={doc}
                            downloading={downloading === doc.id}
                            onDownload={() => handleDownloadDoc(doc.id, doc.fileName)}
                            onDelete={() => {
                              if (confirm(`¿Eliminar el documento "${doc.fileName}"?`)) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                          />
                        ))}
                      </ul>
                    ) : null}
                    <DocumentUploader
                      label={d.requiredForAidType ? 'Adjuntar (obligatorio)' : 'Adjuntar'}
                      multiple
                      value={pending}
                      onChange={(files) => setPendingByType((prev) => ({ ...prev, [d.id]: files }))}
                      documentTypeId={d.id}
                    />
                    {pending.length > 0 && (
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => uploadByTypeMutation(d.id, pending)}
                        disabled={uploadByType.isPending}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Subir {pending.length} archivo(s)
                      </Button>
                    )}
                  </div>
                );
              })
            )}
            {documentTypes.some((d) => d.requiredForAidType) &&
              documentTypes
                .filter((d) => d.requiredForAidType)
                .some((d) => (c?.documents.filter((doc) => doc.documentTypeId === d.id).length ?? 0) === 0) && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>
                    Aún faltan documentos obligatorios por tipo de ayuda.
                  </span>
                </div>
              )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Cédula y factura iniciales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {c.idDocumentPath && (
              <InitialFileRow
                label={`Cédula escaneada${c.idDocumentType ? ` (${c.idDocumentType.name})` : ''}`}
                path={c.idDocumentPath}
                censusId={c.id}
                downloading={downloading === 'idDocument'}
                onDownload={() => handleDownloadInitial('idDocument', `cedula-${c.applicantIdNumber}`)}
              />
            )}
            {c.invoicePath && (
              <InitialFileRow
                label={`Factura inicial${c.invoiceType ? ` (${c.invoiceType.name})` : ''}`}
                path={c.invoicePath}
                censusId={c.id}
                downloading={downloading === 'invoice'}
                onDownload={() => handleDownloadInitial('invoice', `factura-${c.applicantIdNumber}`)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Datos de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentEditor
              censusId={c.id}
              initial={{
                aidProvider: c.aidProvider,
                aidObservation: c.aidObservation,
                amountUsd: c.amountUsd,
                amountBs: c.amountBs,
                paymentRate: c.paymentRate,
                paymentDate: c.paymentDate ? c.paymentDate.slice(0, 10) : '',
                paymentStatus: c.paymentStatus,
              }}
            />
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
  censusId: string;
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
        <span className="ml-1 hidden sm:inline">Descargar</span>
      </Button>
    </div>
  );
}

function DocumentRow({
  doc,
  downloading,
  onDownload,
  onDelete,
}: {
  doc: { id: string; fileName: string; size: number; uploadedAt: string };
  downloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 border border-border rounded p-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="truncate">{doc.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {fileSize(doc.size)} · {formatDateTime(doc.uploadedAt)}
        </p>
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
      <Button
        size="sm"
        variant="outline"
        onClick={onDelete}
        title="Eliminar"
        className="text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function PaymentEditor({
  censusId,
  initial,
}: {
  censusId: string;
  initial: {
    aidProvider: string | null;
    aidObservation: string | null;
    amountUsd: string | null;
    amountBs: string | null;
    paymentRate: string | null;
    paymentDate: string;
    paymentStatus: 'PENDIENTE' | 'PAGADO' | 'ANULADO' | null;
  };
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [aidProvider, setAidProvider] = useState(initial.aidProvider ?? '');
  const [aidObservation, setAidObservation] = useState(initial.aidObservation ?? '');
  const [amountUsd, setAmountUsd] = useState(initial.amountUsd ?? '');
  const [amountBs, setAmountBs] = useState(initial.amountBs ?? '');
  const [paymentRate, setPaymentRate] = useState(initial.paymentRate ?? '');
  const [paymentDate, setPaymentDate] = useState(initial.paymentDate);
  const [paymentStatus, setPaymentStatus] = useState<string>(initial.paymentStatus ?? '');

  useEffect(() => {
    setAidProvider(initial.aidProvider ?? '');
    setAidObservation(initial.aidObservation ?? '');
    setAmountUsd(initial.amountUsd ?? '');
    setAmountBs(initial.amountBs ?? '');
    setPaymentRate(initial.paymentRate ?? '');
    setPaymentDate(initial.paymentDate);
    setPaymentStatus(initial.paymentStatus ?? '');
  }, [initial]);

  const mutation = useMutation({
    mutationFn: () =>
      updatePayment(censusId, {
        aidProvider: aidProvider || null,
        aidObservation: aidObservation || null,
        amountUsd: amountUsd || null,
        amountBs: autoCalcBs || null,
        paymentRate: paymentRate || null,
        paymentDate: paymentDate || null,
        paymentStatus: (paymentStatus || null) as 'PENDIENTE' | 'PAGADO' | 'ANULADO' | null,
      }),
    onSuccess: () => {
      toast.success('Datos de pago actualizados');
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ['census', censusId] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudieron guardar los datos de pago')),
  });

  const usd = parseFloat(amountUsd) || 0;
  const rate = parseFloat(paymentRate) || 0;
  const autoCalcBs = usd > 0 && rate > 0 ? (usd * rate).toFixed(2) : amountBs;

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Row label="Proveedor" value={initial.aidProvider} />
          <Row label="Estatus de pago" value={initial.paymentStatus ? <StatusBadge status={initial.paymentStatus} /> : null} />
          <Row label="Tasa del día" value={initial.paymentRate} />
          <Row label="Fecha de pago" value={formatDate(initial.paymentDate)} />
          <Row label="Monto (USD)" value={initial.amountUsd ? formatCurrency(initial.amountUsd, 'USD') : null} />
          <Row label="Monto (Bs.)" value={initial.amountBs ? formatCurrency(Number(initial.amountBs), 'VES') : null} />
          <div className="sm:col-span-2">
            <Row label="Observación" value={initial.aidObservation} />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4 mr-1" /> Editar datos de pago
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="aidProvider">Proveedor</Label>
          <Input id="aidProvider" value={aidProvider} onChange={(e) => setAidProvider(e.target.value)} />
        </div>
        <div>
          <Label>Estatus de pago</Label>
          <Select value={paymentStatus || 'none'} onValueChange={(v) => setPaymentStatus(v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin especificar</SelectItem>
              {PAYMENT_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="amountUsd">Monto (USD)</Label>
          <Input id="amountUsd" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <Label htmlFor="amountBs">Monto (Bs.)</Label>
          <Input id="amountBs" value={autoCalcBs} onChange={(e) => setAmountBs(e.target.value)} placeholder="0.00" />
          {usd > 0 && rate > 0 && (
            <p className="help-text">Calculado automáticamente: ${usd} × tasa {rate} = Bs. {autoCalcBs}</p>
          )}
        </div>
        <div>
          <Label htmlFor="paymentRate">Tasa del día</Label>
          <Input id="paymentRate" value={paymentRate} onChange={(e) => setPaymentRate(e.target.value)} placeholder="0.0000" />
        </div>
        <div>
          <Label htmlFor="paymentDate">Fecha de pago</Label>
          <Input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="aidObservation">Observación</Label>
          <Textarea id="aidObservation" rows={2} value={aidObservation} onChange={(e) => setAidObservation(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Guardar
        </Button>
        <Button variant="outline" onClick={() => setEditing(false)} disabled={mutation.isPending}>
          <X className="h-4 w-4 mr-1" /> Cancelar
        </Button>
      </div>
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
