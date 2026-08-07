import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  current: number;
  steps: string[];
}

export function Stepper({ current, steps }: StepperProps) {
  return (
    <ol className="flex items-center w-full mb-8">
      {steps.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <li
            key={label}
            className={cn('flex items-center', idx < steps.length - 1 && 'flex-1')}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm border-2',
                  done && 'bg-primary border-primary text-primary-foreground',
                  active && 'border-primary text-primary bg-white',
                  !done && !active && 'border-border text-muted-foreground bg-white',
                )}
              >
                {done ? <Check className="h-5 w-5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  active ? 'text-secondary' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-3',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
