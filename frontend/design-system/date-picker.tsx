import { useState } from 'react';

import { Button } from '../components/ui/button.js';
import { Calendar } from '../components/ui/calendar.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover.js';

function localDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parsedDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return undefined;
  const date = new Date(year, month - 1, day);
  return localDate(date) === value ? date : undefined;
}

export interface DatePickerProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly min?: string;
  readonly max?: string;
  readonly disabled?: boolean;
}

export function DatePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
}: DatePickerProps): React.JSX.Element {
  const [draft, setDraft] = useState(value);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const current = draft === value ? value : draft;
  const invalid =
    current !== '' &&
    (parsedDate(current) === undefined ||
      (min !== undefined && current < min) ||
      (max !== undefined && current > max));

  function choose(next: string): void {
    setDraft(next);
    if (
      next === '' ||
      (parsedDate(next) !== undefined &&
        (min === undefined || next >= min) &&
        (max === undefined || next <= max))
    ) {
      onChange(next);
      setCalendarOpen(false);
    }
  }

  return (
    <div data-slot="date-picker" className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-w-0 flex-wrap gap-2">
        <Input
          id={id}
          type="date"
          className="min-w-0 flex-1"
          value={current}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          {...(min === undefined ? {} : { min })}
          {...(max === undefined ? {} : { max })}
          onChange={(event) => choose(event.currentTarget.value)}
        />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger render={<Button variant="outline" disabled={disabled} />}>
            Calendar
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={parsedDate(value)}
              onSelect={(date) => {
                if (date !== undefined) choose(localDate(date));
              }}
              disabled={(date) =>
                (min !== undefined && localDate(date) < min) ||
                (max !== undefined && localDate(date) > max)
              }
            />
          </PopoverContent>
        </Popover>
      </div>
      {invalid ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          Date is outside the allowed range
        </p>
      ) : null}
    </div>
  );
}

export interface TimePickerProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly min?: string;
  readonly max?: string;
  readonly disabled?: boolean;
}

export function TimePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
}: TimePickerProps): React.JSX.Element {
  return (
    <div data-slot="time-picker" className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        {...(min === undefined ? {} : { min })}
        {...(max === undefined ? {} : { max })}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  );
}

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: Omit<TimePickerProps, 'min' | 'max'>): React.JSX.Element {
  return (
    <div data-slot="date-time-picker" className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="datetime-local"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  );
}

export interface DateRangePickerProps {
  readonly id: string;
  readonly start: string;
  readonly end: string;
  readonly onChange: (range: { readonly start: string; readonly end: string }) => void;
  readonly min?: string;
  readonly max?: string;
}

export function DateRangePicker({
  id,
  start,
  end,
  onChange,
  min,
  max,
}: DateRangePickerProps): React.JSX.Element {
  const invalid = start !== '' && end !== '' && start > end;
  return (
    <fieldset data-slot="date-range-picker" className="grid gap-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Date range</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <DatePicker
          id={`${id}-start`}
          label="Start date"
          value={start}
          onChange={(next) => onChange({ start: next, end })}
          {...(min === undefined ? {} : { min })}
          {...(max === undefined ? {} : { max })}
        />
        <DatePicker
          id={`${id}-end`}
          label="End date"
          value={end}
          onChange={(next) => onChange({ start, end: next })}
          {...(min === undefined ? {} : { min })}
          {...(max === undefined ? {} : { max })}
        />
      </div>
      {invalid ? (
        <p role="alert" className="text-sm text-destructive">
          End date must follow start date
        </p>
      ) : null}
    </fieldset>
  );
}
