import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isSentinelIdNumber } from '@/lib/schemas/census';

type IdMode = 'CEDULA' | 'SITUR' | 'N/A' | 'N/P';

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
  const trimmed = (value || '').trim().toUpperCase();
  const sentinel = isSentinelIdNumber(trimmed);
  const mode: IdMode = sentinel ? (trimmed as IdMode) : trimmed.startsWith('C-') ? 'SITUR' : 'CEDULA';

  function handleMode(next: string) {
    if (next === 'CEDULA') onChange('');
    else if (next === 'SITUR') onChange('C-');
    else onChange(next);
  }

  return (
    <div className="flex gap-2">
      <Select value={mode} onValueChange={handleMode} disabled={disabled}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CEDULA">Cédula</SelectItem>
          <SelectItem value="SITUR">SITUR</SelectItem>
          <SelectItem value="N/A">No aplica</SelectItem>
          <SelectItem value="N/P">No posee</SelectItem>
        </SelectContent>
      </Select>
      <Input
        id={id}
        className="flex-1"
        value={sentinel ? '' : value ?? ''}
        placeholder={sentinel ? 'No aplica / no posee' : mode === 'SITUR' ? 'C-123456789' : placeholder}
        disabled={disabled || sentinel}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
