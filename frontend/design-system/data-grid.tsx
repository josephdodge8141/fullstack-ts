import { useMemo, useState } from 'react';

import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table.js';

export interface DataGridColumn<Row> {
  readonly id: string;
  readonly label: string;
  readonly value: (row: Row) => string | number;
  readonly render?: (row: Row) => React.ReactNode;
  readonly sortable?: boolean;
}

export interface DataGridProps<Row> {
  readonly rows: readonly Row[];
  readonly columns: readonly DataGridColumn<Row>[];
  readonly getRowId: (row: Row) => string;
  readonly searchText: (row: Row) => string;
  readonly rowLabel: (row: Row) => string;
  readonly pageSize?: number;
  readonly emptyMessage?: string;
  readonly onSelectionChange?: (ids: readonly string[]) => void;
}

export function DataGrid<Row>({
  rows,
  columns,
  getRowId,
  searchText,
  rowLabel,
  pageSize = 10,
  emptyMessage = 'No matching records',
  onSelectionChange,
}: DataGridProps<Row>): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ id: string; direction: 'ascending' | 'descending' }>();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const visibleColumns = columns.filter((column) => !hidden.has(column.id));

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const result = rows.filter((row) => searchText(row).toLocaleLowerCase().includes(normalized));
    const column = columns.find((candidate) => candidate.id === sort?.id);
    if (column === undefined || sort === undefined) return result;
    return [...result].sort((left, right) => {
      const leftValue = column.value(left);
      const rightValue = column.value(right);
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
      return sort.direction === 'ascending' ? comparison : -comparison;
    });
  }, [columns, query, rows, searchText, sort]);

  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const pages = Math.max(1, Math.ceil(filtered.length / safePageSize));
  const currentPage = Math.min(page, pages - 1);
  const visibleRows = filtered.slice(currentPage * safePageSize, (currentPage + 1) * safePageSize);
  const visibleIds = visibleRows.map(getRowId);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function updateSelection(next: ReadonlySet<string>): void {
    setSelected(next);
    onSelectionChange?.([...next]);
  }

  function toggleRow(id: string): void {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateSelection(next);
  }

  function toggleVisible(): void {
    const next = new Set(selected);
    for (const id of visibleIds) {
      if (allVisibleSelected) next.delete(id);
      else next.add(id);
    }
    updateSelection(next);
  }

  function toggleSort(id: string): void {
    setSort((previous) => ({
      id,
      direction:
        previous?.id === id && previous.direction === 'ascending' ? 'descending' : 'ascending',
    }));
    setPage(0);
  }

  function toggleColumn(id: string): void {
    if (!hidden.has(id) && visibleColumns.length === 1) return;
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHidden(next);
  }

  return (
    <section data-slot="data-grid" aria-label="Data grid" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-xs">
          <label className="mb-1 block text-sm font-medium" htmlFor="data-grid-search">
            Search records
          </label>
          <Input
            id="data-grid-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setPage(0);
            }}
          />
        </div>
        <details className="relative rounded-md border px-3 py-2 text-sm">
          <summary className="cursor-pointer select-none">Columns</summary>
          <div className="absolute end-0 z-20 mt-2 min-w-40 space-y-2 rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
            {columns.map((column) => (
              <label key={column.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!hidden.has(column.id)}
                  disabled={!hidden.has(column.id) && visibleColumns.length === 1}
                  onChange={() => toggleColumn(column.id)}
                />
                {column.label}
              </label>
            ))}
          </div>
        </details>
      </div>
      <div className="w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select visible rows"
                  checked={allVisibleSelected}
                  onChange={toggleVisible}
                  disabled={visibleRows.length === 0}
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  aria-sort={sort?.id === column.id ? sort.direction : 'none'}
                >
                  {column.sortable === false ? (
                    column.label
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-start font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      aria-label={`Sort by ${column.label.toLocaleLowerCase()}`}
                      onClick={() => toggleSort(column.id)}
                    >
                      {column.label}
                      {sort?.id === column.id ? (sort.direction === 'ascending' ? ' ↑' : ' ↓') : ''}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="py-10 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => {
                const id = getRowId(row);
                return (
                  <TableRow key={id} data-selected={selected.has(id)}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${rowLabel(row)}`}
                        checked={selected.has(id)}
                        onChange={() => toggleRow(id)}
                      />
                    </TableCell>
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id}>
                        {column.render?.(row) ?? column.value(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-live="polite">
        <span>{selected.size} selected</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span>
            Page {currentPage + 1} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pages - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
