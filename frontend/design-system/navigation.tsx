import type { ReactNode } from 'react';
import { cn } from 'cn';

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
}

export function BottomNavigation({
  label,
  items,
  value,
  onChange,
}: {
  readonly label: string;
  readonly items: readonly NavigationItem[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <nav
      data-slot="bottom-navigation"
      aria-label={label}
      className="flex min-w-0 justify-around border-t bg-background p-1"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={value === item.id ? 'page' : undefined}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
            value === item.id && 'bg-accent text-accent-foreground',
          )}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export interface Step {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export function Stepper({
  steps,
  activeIndex,
  onStepChange,
}: {
  readonly steps: readonly Step[];
  readonly activeIndex: number;
  readonly onStepChange?: (index: number) => void;
}): React.JSX.Element {
  return (
    <ol data-slot="stepper" className="flex min-w-0 flex-wrap gap-3" aria-label="Progress steps">
      {steps.map((step, index) => {
        const state =
          index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming';
        const content = (
          <>
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full border text-xs',
                state === 'current' && 'border-primary bg-primary text-primary-foreground',
                state === 'complete' && 'border-primary text-primary',
              )}
            >
              {state === 'complete' ? '✓' : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{step.label}</span>
              {step.description === undefined ? null : (
                <span className="block text-xs text-muted-foreground">{step.description}</span>
              )}
            </span>
          </>
        );
        return (
          <li
            key={step.id}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            className="min-w-0 flex-1 basis-32"
          >
            {onStepChange === undefined ? (
              <span className="flex items-center gap-2">{content}</span>
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md text-start focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => onStepChange(index)}
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
