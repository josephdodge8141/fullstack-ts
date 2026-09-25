import { useLayoutEffect, useRef } from 'react';

import { Textarea } from '../components/ui/textarea.js';

export function TextareaAutosize({
  value,
  onChange,
  minRows = 2,
  maxRows = 12,
  ...props
}: Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'> & {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly minRows?: number;
  readonly maxRows?: number;
}): React.JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight) || 24;
    element.style.height = 'auto';
    element.style.height = `${Math.min(Math.max(element.scrollHeight, lineHeight * minRows), lineHeight * maxRows)}px`;
  }, [maxRows, minRows, value]);
  return (
    <Textarea
      data-slot="textarea-autosize"
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      {...props}
    />
  );
}
