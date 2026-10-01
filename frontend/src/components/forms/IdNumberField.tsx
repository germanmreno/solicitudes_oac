import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isSentinelIdNumber } from '@/lib/schemas/census';

export function IdNumberField({
  id,
  value,
  onChange,
  onBlur,
  placeholder = 'V-27376369',
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const sentinel = isSentinelIdNumber(value || '');
  const mode = sentinel ? value.toUpperCase() : 'CEDULA';

  return (
    <div className="flex gap-2">
      <Select value={mode} onValueChange={(v) => onChange(v === 'CEDULA' ? '' : v)} disabled={disabled}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CEDULA">Cédula</SelectItem>
          <SelectItem value="N/A">No aplica</SelectItem>
          <SelectItem value="N/P">No posee</SelectItem>
        </SelectContent>
      </Select>
      <Input
        id={id}
        className="flex-1"
        value={sentinel ? '' : value ?? ''}
        placeholder={sentinel ? 'No aplica / no posee' : placeholder}
        disabled={disabled || sentinel}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
