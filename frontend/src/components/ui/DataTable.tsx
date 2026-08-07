import * as React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortBy?: (row: T) => string | number | null;
  sortAscLabel?: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  items: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  emptyMessage?: React.ReactNode;
  caption?: string;
  ariaLabel: string;
}

export function DataTable<T>({
  items,
  columns,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  emptyMessage = 'Sin datos para mostrar.',
  caption,
  ariaLabel,
}: DataTableProps<T>) {
  const renderSort = (col: DataTableColumn<T>) => {
    if (!col.sortBy || !sort || !onSortChange) return null;
    const isActive = sort.columnId === col.id;
    const direction = isActive ? sort.direction : undefined;
    const ariaSort: 'ascending' | 'descending' | 'none' =
      direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
    const next: DataTableSort | undefined = !isActive
      ? { columnId: col.id, direction: 'asc' }
      : direction === 'asc'
        ? { columnId: col.id, direction: 'desc' }
        : undefined;
    return (
      <button
        type="button"
        onClick={() => next && onSortChange(next)}
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
        aria-label={
          isActive
            ? `${col.sortAscLabel ?? col.id}: ordenado ${direction === 'asc' ? 'ascendente' : 'descendente'}. Clic para cambiar.`
            : `${col.sortAscLabel ?? col.id}: sin ordenar. Clic para ordenar ascendente.`
        }
      >
        {col.header}
        {direction === 'asc' && <ChevronUp className="h-3 w-3" />}
        {direction === 'desc' && <ChevronDown className="h-3 w-3" />}
        {!direction && <ChevronsUpDown className="h-3 w-3" />}
        <span className="sr-only" aria-live="polite">
          {ariaSort === 'none' ? '' : `Ordenado ${ariaSort === 'ascending' ? 'ascendente' : 'descendente'}`}
        </span>
      </button>
    );
  };

  const getAriaSort = (col: DataTableColumn<T>): 'ascending' | 'descending' | 'none' => {
    if (!sort || col.id !== sort.columnId) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="overflow-x-auto" role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                aria-sort={col.sortBy ? getAriaSort(col) : undefined}
                className={cn(
                  'text-left px-3 py-2 font-medium text-muted-foreground',
                  col.className,
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                )}
              >
                {renderSort(col) ?? <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{col.header}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-muted-foreground py-8">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  'border-b border-border last:border-b-0',
                  onRowClick && 'cursor-pointer hover:bg-muted/40 focus-within:bg-muted/40',
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : -1}
                role={onRowClick ? 'button' : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      'px-3 py-2 align-middle',
                      col.className,
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
