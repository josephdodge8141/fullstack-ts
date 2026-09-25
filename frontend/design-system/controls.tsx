import { useState } from 'react';
import { cn } from 'cn';

import { Button } from '../components/ui/button.js';

export interface RatingProps {
  readonly label: string;
  readonly value: number;
  readonly onChange?: (value: number) => void;
  readonly max?: number;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}

export function Rating({
  label,
  value,
  onChange,
  max = 5,
  disabled = false,
  readOnly = false,
}: RatingProps): React.JSX.Element {
  const count = Number.isInteger(max) && max > 0 ? max : 5;
  return (
    <fieldset
      data-slot="rating"
      aria-label={label}
      className="inline-flex items-center gap-1"
      disabled={disabled}
    >
      <legend className="sr-only">{label}</legend>
      {Array.from({ length: count }, (_, index) => index + 1).map((score) => (
        <button
          key={score}
          type="button"
          className={cn(
            'text-2xl leading-none text-muted-foreground transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring',
            score <= value && 'text-primary',
          )}
          aria-label={`${score} of ${count} stars`}
          aria-pressed={score === value}
          disabled={disabled || readOnly}
          onClick={() => onChange?.(score)}
        >
          <span aria-hidden="true">★</span>
        </button>
      ))}
    </fieldset>
  );
}

export function FloatingActionButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>): React.JSX.Element {
  return (
    <Button
      data-slot="floating-action-button"
      size="icon-lg"
      className={cn('rounded-full shadow-lg', className)}
      {...props}
    />
  );
}

export interface SpeedDialAction {
  readonly id: string;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly onClick: () => void;
}

export function SpeedDial({
  label,
  icon,
  actions,
}: {
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly actions: readonly SpeedDialAction[];
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div
      data-slot="speed-dial"
      className="relative inline-flex flex-col items-end gap-2"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      {open ? (
        <div className="flex flex-col items-end gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="secondary"
              className="rounded-full shadow-md"
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      ) : null}
      <FloatingActionButton
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        {icon}
      </FloatingActionButton>
    </div>
  );
}

export function Chip({
  label,
  onRemove,
  disabled = false,
}: {
  readonly label: string;
  readonly onRemove?: () => void;
  readonly disabled?: boolean;
}): React.JSX.Element {
  return (
    <span
      data-slot="chip"
      className="inline-flex min-h-7 items-center gap-1 rounded-full border bg-secondary px-2.5 text-xs font-medium text-secondary-foreground"
    >
      {label}
      {onRemove === undefined ? null : (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          className="rounded-full px-1 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          disabled={disabled}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </span>
  );
}
