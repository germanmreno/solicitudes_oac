import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarClock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCensus } from '@/features/census/census.api';
import { dateInputToIso, toDateInputValue } from '@/lib/schemas/census';
import { getErrorMessage } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';

export interface EditableCensusDate {
  id: string;
  fileNumber: string | null;
  applicantName: string;
  registrationDate: string;
}

export function EditDateDialog({
  census,
  open,
  onOpenChange,
}: {
  census: EditableCensusDate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState('');

  useEffect(() => {
    if (open && census) setDate(toDateInputValue(new Date(census.registrationDate)));
  }, [open, census]);

  const mutation = useMutation({
    mutationFn: () => updateCensus(census!.id, { registrationDate: dateInputToIso(date) }),
    onSuccess: () => {
      toast.success('Fecha de registro actualizada');
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['census'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudo actualizar la fecha')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Editar fecha de registro
          </DialogTitle>
          <DialogDescription>
            {census
              ? `Solicitud de ${census.applicantName}${census.fileNumber ? ` (${census.fileNumber})` : ''}.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="registration-date">Fecha de registro</Label>
            <Input
              id="registration-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !date}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <CalendarClock className="h-4 w-4 mr-1" />
            )}
            Guardar fecha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
