import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2 } from 'lucide-react';
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
import { updatePayment } from '@/features/census/census.api';
import { getErrorMessage } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';

export function ConfirmPaymentDialog({
  censusId,
  open,
  onOpenChange,
}: {
  censusId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  const mutation = useMutation({
    mutationFn: () =>
      updatePayment(censusId, {
        paymentStatus: 'PAGADO',
        paymentDate: paymentDate || null,
      }),
    onSuccess: () => {
      toast.success('Pago confirmado');
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['census', censusId] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'No se pudo confirmar el pago')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Confirmar pago
          </DialogTitle>
          <DialogDescription>
            Marque la solicitud como pagada. Se registrará la fecha de pago y el estatus quedará en "Pagado".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="payment-date">Fecha de pago</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Confirmar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
