import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { censusFormSchema, type CensusFormValues } from '@/lib/schemas/census';
import { listOriginTypes, listSites, listExternalOrigins, listAidTypes, listAidAreas } from '@/features/catalogs/catalogs.api';
import { updateCensus, type CensusDetail } from '@/features/census/census.api';
import { getErrorMessage } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';

const SEX_OPTIONS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
];

export function EditCensusDialog({
  census,
  open,
  onOpenChange,
}: {
  census: CensusDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();

  const { data: originTypes = [] } = useQuery({ queryKey: ['origin-types'], queryFn: () => listOriginTypes(), staleTime: 60000 });
  const { data: sites = [] } = useQuery({ queryKey: ['sites'], queryFn: () => listSites(), staleTime: 60000 });
  const { data: externalOrigins = [] } = useQuery({ queryKey: ['external-origins'], queryFn: () => listExternalOrigins(), staleTime: 60000 });
  const { data: aidTypes = [] } = useQuery({ queryKey: ['aid-types'], queryFn: () => listAidTypes(), staleTime: 60000 });

  const form = useForm<CensusFormValues>({
    resolver: zodResolver(censusFormSchema),
    defaultValues: buildDefaults(census),
    mode: 'onBlur',
  });

  const watchedOriginTypeId = form.watch('originTypeId');
  const watchedAidTypeId = form.watch('aidTypeId');
  const watchedBeneficiarySame = form.watch('beneficiarySameAsApplicant');
  const selectedOriginType = originTypes.find((o) => o.id === watchedOriginTypeId);

  const { data: aidAreas = [] } = useQuery({
    queryKey: ['aid-areas', watchedAidTypeId],
    queryFn: () => listAidAreas(watchedAidTypeId),
    enabled: !!watchedAidTypeId,
    staleTime: 60000,
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(census));
  }, [open, census, form]);

  const mutation = useMutation({
    mutationFn: (values: CensusFormValues) => {
      const { aidStatus: _aidStatus, paymentStatus: _paymentStatus, paymentDate: _paymentDate, ...payload } = values as Record<string, unknown>;
      return updateCensus(census.id, payload);
    },
    onSuccess: () => {
      toast.success('Solicitud actualizada correctamente');
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['census', census.id] });
      void qc.invalidateQueries({ queryKey: ['census'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudo actualizar la solicitud')),
  });

  function onSubmit(values: CensusFormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar solicitud</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 text-sm">
          <section>
            <h3 className="font-semibold text-secondary mb-2">Solicitante</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre *" error={form.formState.errors.applicantName?.message}>
                <Input {...form.register('applicantName')} />
              </Field>
              <Field label="Cédula *" error={form.formState.errors.applicantIdNumber?.message}>
                <Input {...form.register('applicantIdNumber')} />
              </Field>
              <Field label="Sexo *">
                <Controller
                  control={form.control}
                  name="applicantSex"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                      <SelectContent>
                        {SEX_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Teléfono">
                <Input {...form.register('phone')} placeholder="04141234567" />
              </Field>
              <Field label="Correo electrónico" error={form.formState.errors.email?.message} className="sm:col-span-2">
                <Input {...form.register('email')} placeholder="correo@ejemplo.com" />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-secondary mb-2">Procedencia</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tipo de procedencia *" error={form.formState.errors.originTypeId?.message}>
                <Controller
                  control={form.control}
                  name="originTypeId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                      <SelectContent>
                        {originTypes.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              {selectedOriginType?.requiresSite ? (
                <Field label="Sede *">
                  <Controller
                    control={form.control}
                    name="siteId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger><SelectValue placeholder="Seleccione una sede" /></SelectTrigger>
                        <SelectContent>
                          {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              ) : (
                <Field label="Procedencia externa">
                  <Controller
                    control={form.control}
                    name="externalOriginId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger><SelectValue placeholder="Seleccione una procedencia externa" /></SelectTrigger>
                        <SelectContent>
                          {externalOrigins.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              )}
              <Field label="Detalle de procedencia / comunidad" className="sm:col-span-2">
                <Input {...form.register('originDetail')} placeholder="Ej: Comunidad X, Municipio Sifontes" />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-secondary mb-2">Beneficiario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="¿Es el mismo solicitante?">
                <Controller
                  control={form.control}
                  name="beneficiarySameAsApplicant"
                  render={({ field }) => (
                    <Select onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sí</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              {!watchedBeneficiarySame && (
                <>
                  <Field label="Nombre del beneficiario *" error={form.formState.errors.beneficiaryName?.message}>
                    <Input {...form.register('beneficiaryName')} />
                  </Field>
                  <Field label="Cédula del beneficiario *" error={form.formState.errors.beneficiaryIdNumber?.message}>
                    <Input {...form.register('beneficiaryIdNumber')} />
                  </Field>
                  <Field label="Sexo del beneficiario *">
                    <Controller
                      control={form.control}
                      name="beneficiarySex"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                          <SelectContent>
                            {SEX_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </>
              )}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-secondary mb-2">Ayuda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tipo de ayuda *" error={form.formState.errors.aidTypeId?.message}>
                <Controller
                  control={form.control}
                  name="aidTypeId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                      <SelectContent>
                        {aidTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Área de ayuda *" error={form.formState.errors.aidAreaId?.message}>
                <Controller
                  control={form.control}
                  name="aidAreaId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                      <SelectContent>
                        {aidAreas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Otra especificación del área" className="sm:col-span-2">
                <Input {...form.register('aidAreaOther')} />
              </Field>
              <Field label="Descripción *" error={form.formState.errors.aidDescription?.message} className="sm:col-span-2">
                <Textarea {...form.register('aidDescription')} rows={2} />
              </Field>
              <Field label="Proveedor">
                <Input {...form.register('aidProvider')} />
              </Field>
              <Field label="Observación">
                <Input {...form.register('aidObservation')} />
              </Field>
              <Field label="Monto (USD)">
                <Input {...form.register('amountUsd')} placeholder="0.00" />
              </Field>
              <Field label="Monto (Bs.)">
                <Input {...form.register('amountBs')} placeholder="0.00" />
              </Field>
              <Field label="Tasa del día">
                <Input {...form.register('paymentRate')} placeholder="0.0000" />
              </Field>
              <Field label="Modalidad de gestión">
                <Input {...form.register('managementMode')} />
              </Field>
              <Field label="Ente u organismo cooperante">
                <Input {...form.register('cooperatingEntity')} />
              </Field>
              <Field label="Responsable">
                <Input {...form.register('responsibleName')} />
              </Field>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildDefaults(c: CensusDetail): CensusFormValues {
  return {
    applicantName: c.applicantName,
    applicantIdNumber: c.applicantIdNumber,
    applicantSex: c.applicantSex,
    applicantType: c.applicantType ?? '',
    personnelType: c.personnelType ?? '',
    originTypeId: c.originType?.id ?? '',
    siteId: c.site?.id ?? '',
    externalOriginId: c.externalOrigin?.id ?? '',
    originDetail: c.originDetail ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    beneficiarySameAsApplicant: c.beneficiarySameAsApplicant,
    beneficiaryName: c.beneficiaryName ?? '',
    beneficiaryIdNumber: c.beneficiaryIdNumber ?? '',
    beneficiarySex: c.beneficiarySex ?? undefined,
    aidTypeId: c.aidType?.id ?? '',
    aidAreaId: c.aidArea?.id ?? '',
    aidAreaOther: c.aidAreaOther ?? '',
    aidDescription: c.aidDescription,
    managementMode: c.managementMode ?? '',
    cooperatingEntity: c.cooperatingEntity ?? '',
    aidProvider: c.aidProvider ?? '',
    aidObservation: c.aidObservation ?? '',
    amountUsd: c.amountUsd ?? '',
    amountBs: c.amountBs ?? '',
    paymentRate: c.paymentRate ?? '',
    responsibleName: c.responsibleName ?? '',
  } as CensusFormValues;
}

function Field({
  label,
  children,
  error,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
