import { useState } from 'react';

import { Button } from '../components/ui/button.js';

export interface TransferItem {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface TransferListProps {
  readonly items: readonly TransferItem[];
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
}

export function TransferList({
  items,
  selectedIds,
  onChange,
}: TransferListProps): React.JSX.Element {
  const [marked, setMarked] = useState<ReadonlySet<string>>(() => new Set());
  const selected = new Set(selectedIds);
  const availableItems = items.filter((item) => !selected.has(item.id));
  const selectedItems = items.filter((item) => selected.has(item.id));

  function toggle(id: string): void {
    const next = new Set(marked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setMarked(next);
  }

  function move(toSelected: boolean): void {
    const next = new Set(selectedIds);
    for (const item of items) {
      if (!marked.has(item.id) || item.disabled) continue;
      if (toSelected) next.add(item.id);
      else next.delete(item.id);
    }
    onChange([...next]);
    setMarked(new Set());
  }

  function list(label: string, entries: readonly TransferItem[]): React.JSX.Element {
    return (
      <div className="min-w-0 rounded-lg border">
        <p className="border-b px-3 py-2 text-sm font-medium">{label}</p>
        <ul aria-label={`${label} items`} className="min-h-32 space-y-1 p-2">
          {entries.map((item) => (
            <li key={item.id}>
              <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                <input
                  type="checkbox"
                  aria-label={`Select ${item.label}`}
                  checked={marked.has(item.id)}
                  disabled={item.disabled}
                  onChange={() => toggle(item.id)}
                />
                <span className="min-w-0 truncate">{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const canMoveRight = availableItems.some((item) => marked.has(item.id) && !item.disabled);
  const canMoveLeft = selectedItems.some((item) => marked.has(item.id) && !item.disabled);

  return (
    <div
      data-slot="transfer-list"
      className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center"
    >
      {list('Available', availableItems)}
      <div className="flex justify-center gap-2 sm:flex-col">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Move selected right"
          disabled={!canMoveRight}
          onClick={() => move(true)}
        >
          →
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Move selected left"
          disabled={!canMoveLeft}
          onClick={() => move(false)}
        >
          ←
        </Button>
      </div>
      {list('Selected', selectedItems)}
    </div>
  );
}
