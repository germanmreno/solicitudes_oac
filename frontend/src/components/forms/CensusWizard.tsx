import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, ArrowRight, ArrowLeft, Sparkles, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentUploader, type UploadedFileMeta } from '@/components/forms/DocumentUploader';
import { IdNumberField } from '@/components/forms/IdNumberField';
import { Stepper } from '@/components/forms/Stepper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { censusFormSchema, type CensusFormValues } from '@/lib/schemas/census';
import { createCensus, getNextFileNumber } from '@/features/census/census.api';
import { listOriginTypes, listSites, listExternalOrigins, listAidTypes, listAidAreas } from '@/features/catalogs/catalogs.api';
import type { CatalogItem } from '@/features/catalogs/catalogs.api';
import {
  listDocumentTypes,
  type DocumentTypeItem,
} from '@/features/documentTypes/documentTypes.api';
import { db } from '@/lib/offline/db';
import { enqueueMutation } from '@/lib/offline/queue';
import { getErrorMessage } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';

const STEPS = ['Datos del solicitante', 'Datos del beneficiario', 'Información de la ayuda', 'Pago y documentos'];

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

const SEX_OPTIONS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'NO_APLICA', label: 'No aplica' },
];

export function CensusWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [originTypes, setOriginTypes] = useState<CatalogItem[]>([]);
  const [sites, setSites] = useState<CatalogItem[]>([]);
  const [externalOrigins, setExternalOrigins] = useState<CatalogItem[]>([]);
  const [aidTypes, setAidTypes] = useState<CatalogItem[]>([]);
  const [aidAreas, setAidAreas] = useState<CatalogItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeItem[]>([]);
  const [documentFiles, setDocumentFiles] = useState<Record<string, UploadedFileMeta[]>>({});
  const [additionalFiles, setAdditionalFiles] = useState<UploadedFileMeta[]>([]);

  const form = useForm<CensusFormValues>({
    resolver: zodResolver(censusFormSchema),
    defaultValues: {
      aidStatus: 'EN_EVALUACION',
      beneficiarySameAsApplicant: true,
    },
    mode: 'onBlur',
  });

  const watchedOriginTypeId = form.watch('originTypeId');
  const watchedAidTypeId = form.watch('aidTypeId');
  const watchedBeneficiarySame = form.watch('beneficiarySameAsApplicant');
  const selectedOriginType = originTypes.find((ot) => ot.id === watchedOriginTypeId);
  const selectedAidType = aidTypes.find((at) => at.id === watchedAidTypeId);

  useEffect(() => {
    void (async () => {
      try {
        const [ots, sts, exts, ats] = await Promise.all([
          listOriginTypes(),
          listSites(),
          listExternalOrigins(),
          listAidTypes(),
        ]);
        setOriginTypes(ots);
        setSites(sts);
        setExternalOrigins(exts);
        setAidTypes(ats);
        await db.catalogs.bulkPut([
          ...ots.map((o) => ({ ...o, type: 'originType' as const, active: true })),
          ...sts.map((s) => ({ ...s, type: 'site' as const, active: true })),
          ...exts.map((e) => ({ ...e, type: 'externalOrigin' as const, active: true })),
          ...ats.map((a) => ({ ...a, type: 'aidType' as const, active: true })),
        ]);
      } catch {
        const cached = await db.catalogs.toArray();
        setOriginTypes(cached.filter((c) => c.type === 'originType'));
        setSites(cached.filter((c) => c.type === 'site'));
        setExternalOrigins(cached.filter((c) => c.type === 'externalOrigin'));
        setAidTypes(cached.filter((c) => c.type === 'aidType'));
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedAidType) { setAidAreas([]); setDocumentTypes([]); return; }
    void (async () => {
      try {
        const [areas, docs] = await Promise.all([
          listAidAreas(selectedAidType.id),
          listDocumentTypes(selectedAidType.id),
        ]);
        setAidAreas(areas);
        setDocumentTypes(docs);
        await db.catalogs.bulkPut(areas.map((a) => ({ ...a, type: 'aidArea' as const, aidTypeId: selectedAidType.id, active: true })));
        form.setValue('aidAreaId', '');
      } catch {
        const cached = await db.catalogs.where({ type: 'aidArea', aidTypeId: selectedAidType.id }).toArray();
        setAidAreas(cached);
        setDocumentTypes([]);
      }
    })();
  }, [selectedAidType]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedAidArea = aidAreas.find((aa) => aa.id === form.watch('aidAreaId'));

  async function handleGenerateFileNumber() {
    try {
      const next = await getNextFileNumber();
      form.setValue('fileNumber', next, { shouldValidate: true });
    } catch {
      const cached = await db.fileNumbers.toArray();
      const year = new Date().getFullYear();
      const row = cached.find((c) => c.year === year) || (await db.fileNumbers.put({ year, next: 1 }));
      const next = `OAC-${String((row as { next: number }).next).padStart(4, '0')}-${year}`;
      form.setValue('fileNumber', next);
      if ((row as { next: number }).next) {
        await db.fileNumbers.update(year, { next: (row as { next: number }).next + 1 });
      }
      toast.info('Sin conexión: se generó un número tentativo. Verifíquelo al sincronizar.');
    }
  }

  async function goNext() {
    let fieldsToValidate: (keyof CensusFormValues)[] = [];
    if (step === 0) {
      fieldsToValidate = ['applicantName', 'applicantIdNumber', 'applicantSex', 'originTypeId'];
    } else if (step === 1) {
      if (!form.getValues('beneficiarySameAsApplicant')) {
        fieldsToValidate = ['beneficiaryName', 'beneficiaryIdNumber', 'beneficiarySex'];
      }
    } else if (step === 2) {
      fieldsToValidate = ['aidTypeId', 'aidAreaId', 'aidDescription'];
    }
    const ok = await form.trigger(fieldsToValidate);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit(values: CensusFormValues) {
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          formData.append(k, String(v));
        }
      });

      const idDocType = documentTypes.find((d) => d.code === 'ID_DOCUMENT');
      const invoiceDocType = documentTypes.find((d) => d.code === 'INVOICE');
      const medical: UploadedFileMeta[] = [
        ...documentTypes
          .filter((d) => d.code !== 'ID_DOCUMENT' && d.code !== 'INVOICE')
          .flatMap((d) => documentFiles[d.id] ?? []),
        ...additionalFiles,
      ];

      const allUploads: { field: string; files: UploadedFileMeta[] }[] = [];
      if (idDocType && documentFiles[idDocType.id]?.[0]) {
        allUploads.push({ field: 'idDocument', files: [documentFiles[idDocType.id][0]] });
      }
      if (invoiceDocType && documentFiles[invoiceDocType.id]?.[0]) {
        allUploads.push({ field: 'invoice', files: [documentFiles[invoiceDocType.id][0]] });
      }
      if (medical.length > 0) allUploads.push({ field: 'medical', files: medical });

      for (const { field, files } of allUploads) {
        for (const f of files) formData.append(field, f.file);
      }

      if (!navigator.onLine) {
        await db.drafts.put({
          id: crypto.randomUUID(),
          data: values as unknown as Record<string, unknown>,
          step: STEPS.length - 1,
          updatedAt: Date.now(),
        });
        await enqueueMutation({ method: 'POST', url: '/census', body: formData });
        toast.info('Solicitud guardada localmente. Se enviará al recuperar la conexión.');
        navigate('/census/list');
        return;
      }

      const created = await createCensus(formData);
      toast.success(`Solicitud ${created.fileNumber || created.id} creada correctamente.`);
      navigate(`/census/${created.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear la solicitud'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page max-w-3xl">
      <h1 className="text-3xl font-serif text-secondary mb-1">Nueva solicitud</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Complete los datos del solicitante y la ayuda requerida.
      </p>

      <Stepper current={step} steps={STEPS} />

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Información personal y de procedencia del solicitante.'}
              {step === 1 && 'Si el beneficiario es distinto al solicitante, indique sus datos.'}
              {step === 2 && 'Detalles del tipo de ayuda solicitada.'}
              {step === 3 && 'Datos de pago y documentos de la solicitud (opcionales).'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div>
                  <Label htmlFor="fileNumber">N° de expediente (Opcional)</Label>
                  <div className="flex gap-2">
                    <Input id="fileNumber" placeholder="OAC-0001-2026" {...form.register('fileNumber')} />
                    <Button type="button" variant="outline" onClick={handleGenerateFileNumber}>
                      <Sparkles className="h-4 w-4 mr-1" /> Generar
                    </Button>
                  </div>
                  <p className="help-text">Si lo deja vacío, el sistema lo asignará automáticamente.</p>
                  {form.formState.errors.fileNumber && (
                    <p className="error-text">{form.formState.errors.fileNumber.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="applicantName">Nombre del solicitante *</Label>
                  <Input id="applicantName" placeholder="Nombre completo" {...form.register('applicantName')} />
                  {form.formState.errors.applicantName && (
                    <p className="error-text">{form.formState.errors.applicantName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="applicantIdNumber">Cédula *</Label>
                    <Controller
                      control={form.control}
                      name="applicantIdNumber"
                      render={({ field }) => (
                        <IdNumberField
                          id="applicantIdNumber"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    <p className="help-text">Formatos: V-12345678, E-1234567, N-12345678, N/A (no aplica), N/P (no posee)</p>
                    {form.formState.errors.applicantIdNumber && (
                      <p className="error-text">{form.formState.errors.applicantIdNumber.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Sexo *</Label>
                    <Controller
                      control={form.control}
                      name="applicantSex"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione" />
                          </SelectTrigger>
                          <SelectContent>
                            {SEX_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.applicantSex && (
                      <p className="error-text">{form.formState.errors.applicantSex.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Tipo de procedencia *</Label>
                  <Controller
                    control={form.control}
                    name="originTypeId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                          {originTypes.map((ot) => (
                            <SelectItem key={ot.id} value={ot.id}>{ot.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.originTypeId && (
                    <p className="error-text">{form.formState.errors.originTypeId.message}</p>
                  )}
                </div>

                {selectedOriginType?.requiresSite && (
                  <div>
                    <Label>Sede *</Label>
                    <Controller
                      control={form.control}
                      name="siteId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una sede" />
                          </SelectTrigger>
                          <SelectContent>
                            {sites.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.siteId && (
                      <p className="error-text">{form.formState.errors.siteId.message}</p>
                    )}
                  </div>
                )}

                {selectedOriginType && !selectedOriginType.requiresSite && (
                  <div>
                    <Label>Procedencia externa</Label>
                    <Controller
                      control={form.control}
                      name="externalOriginId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una procedencia externa" />
                          </SelectTrigger>
                          <SelectContent>
                            {externalOrigins.map((e) => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="originDetail">Detalle de procedencia / comunidad (Opcional)</Label>
                  <Input id="originDetail" placeholder="Ej: Comunidad X, Municipio Sifontes" {...form.register('originDetail')} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Teléfono (Opcional)</Label>
                    <Input id="phone" placeholder="04141234567" {...form.register('phone')} />
                  </div>
                  <div>
                    <Label htmlFor="email">Correo electrónico (Opcional)</Label>
                    <Input id="email" type="email" placeholder="correo@ejemplo.com" {...form.register('email')} />
                    {form.formState.errors.email && (
                      <p className="error-text">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="beneficiarySameAsApplicant"
                    className="h-4 w-4 accent-primary"
                    checked={watchedBeneficiarySame}
                    onChange={(e) => form.setValue('beneficiarySameAsApplicant', e.target.checked)}
                  />
                  <Label htmlFor="beneficiarySameAsApplicant" className="text-sm font-medium cursor-pointer">
                    El beneficiario es el mismo solicitante
                  </Label>
                </div>

                {!watchedBeneficiarySame && (
                  <>
                    <div>
                      <Label htmlFor="beneficiaryName">Nombre del beneficiario *</Label>
                      <Input id="beneficiaryName" placeholder="Nombre completo" {...form.register('beneficiaryName')} />
                      {form.formState.errors.beneficiaryName && (
                        <p className="error-text">{form.formState.errors.beneficiaryName.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="beneficiaryIdNumber">Cédula del beneficiario *</Label>
                        <Controller
                          control={form.control}
                          name="beneficiaryIdNumber"
                          render={({ field }) => (
                            <IdNumberField
                              id="beneficiaryIdNumber"
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                            />
                          )}
                        />
                        {form.formState.errors.beneficiaryIdNumber && (
                          <p className="error-text">{form.formState.errors.beneficiaryIdNumber.message}</p>
                        )}
                      </div>
                      <div>
                        <Label>Sexo del beneficiario *</Label>
                        <Controller
                          control={form.control}
                          name="beneficiarySex"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione" />
                              </SelectTrigger>
                              <SelectContent>
                                {SEX_OPTIONS.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {form.formState.errors.beneficiarySex && (
                          <p className="error-text">{form.formState.errors.beneficiarySex.message}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label>Tipo de ayuda *</Label>
                  <Controller
                    control={form.control}
                    name="aidTypeId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {aidTypes.map((at) => (
                            <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.aidTypeId && (
                    <p className="error-text">{form.formState.errors.aidTypeId.message}</p>
                  )}
                </div>

                {aidAreas.length > 0 && (
                  <div>
                    <Label>Área de ayuda *</Label>
                    <Controller
                      control={form.control}
                      name="aidAreaId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un área" />
                          </SelectTrigger>
                          <SelectContent>
                            {aidAreas.map((aa) => (
                              <SelectItem key={aa.id} value={aa.id}>{aa.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.aidAreaId && (
                      <p className="error-text">{form.formState.errors.aidAreaId.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="aidDescription">Descripción *</Label>
                  <Textarea
                    id="aidDescription"
                    placeholder="Detalle la situación o necesidad del solicitante"
                    rows={4}
                    {...form.register('aidDescription')}
                  />
                  {form.formState.errors.aidDescription && (
                    <p className="error-text">{form.formState.errors.aidDescription.message}</p>
                  )}
                </div>

                {selectedAidArea?.requiresDetail && (
                  <div>
                    <Label htmlFor="aidAreaOther">Especifique el área *</Label>
                    <Input id="aidAreaOther" placeholder="Detalle" {...form.register('aidAreaOther')} />
                    {form.formState.errors.aidAreaOther && (
                      <p className="error-text">{form.formState.errors.aidAreaOther.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Estatus *</Label>
                  <Controller
                    control={form.control}
                    name="aidStatus"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="aidProvider">Proveedor (Opcional)</Label>
                    <Input id="aidProvider" {...form.register('aidProvider')} />
                  </div>
                  <div>
                    <Label htmlFor="amountUsd">Monto ($) (Opcional)</Label>
                    <Input id="amountUsd" placeholder="0.00" {...form.register('amountUsd')} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="amountBs">Monto (Bs.) (Opcional)</Label>
                  <Input id="amountBs" placeholder="0.00" {...form.register('amountBs')} />
                </div>

                <div>
                  <Label htmlFor="aidObservation">Observación (Opcional)</Label>
                  <Textarea id="aidObservation" rows={3} {...form.register('aidObservation')} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentRate">Tasa del día (Opcional)</Label>
                    <Input id="paymentRate" placeholder="0.0000" {...form.register('paymentRate')} />
                  </div>
                  <div>
                    <Label htmlFor="paymentDate">Fecha de pago (Opcional)</Label>
                    <Input id="paymentDate" type="date" {...form.register('paymentDate')} />
                  </div>
                </div>

                <div>
                  <Label>Estatus de pago (Opcional)</Label>
                  <Controller
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin especificar" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-secondary">Documentos (opcional)</h3>
                    <span className="text-xs text-muted-foreground">Puede agregarlos después</span>
                  </div>
                  {documentTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Seleccione un tipo de ayuda en el paso anterior para ver los documentos sugeridos.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {documentTypes
                        .filter((d) => d.requiredForAidType || d.requiredByDefault)
                        .map((d) => (
                          <DocumentUploader
                            key={d.id}
                            compact
                            label={`${d.name}${d.requiredForAidType || d.code === 'ID_DOCUMENT' ? ' (recomendado)' : ' (opcional)'}`}
                            multiple
                            value={documentFiles[d.id] ?? []}
                            onChange={(files) => setDocumentFiles((prev) => ({ ...prev, [d.id]: files }))}
                            documentTypeId={d.id}
                          />
                        ))}
                    </div>
                  )}
                  <DocumentUploader
                    label="Documentos adicionales (opcional)"
                    value={additionalFiles}
                    onChange={setAdditionalFiles}
                  />
                  <div className="rounded-md bg-muted/50 border border-border p-3 text-muted-foreground text-sm flex items-start gap-2">
                    <FileWarning className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      Puede guardar la solicitud sin adjuntar documentos. Cárguelos ahora si los tiene a
                      mano, o agréguelos luego desde el detalle de la solicitud.
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0 || submitting}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Siguiente <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar solicitud
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
