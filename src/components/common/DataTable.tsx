import React from 'react';
import { cn } from '../../utils/cn';

interface Column<T> {
  header: string;
  key: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({ 
  columns, 
  data, 
  onRowClick,
  className,
  showCheckboxes = false,
  selectedRows = [],
  onToggleRow,
  onToggleAll
}: DataTableProps<T> & { 
  showCheckboxes?: boolean;
  selectedRows?: (string | number)[];
  onToggleRow?: (id: string | number) => void;
  onToggleAll?: () => void;
}) {
  const allSelected = data.length > 0 && selectedRows.length === data.length;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-table-header border-y border-border">
            {showCheckboxes && (
              <th className="px-5 py-3 w-10">
                <input 
                  type="checkbox" 
                  className="rounded-sm border-border text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer" 
                  checked={allSelected}
                  onChange={onToggleAll || (() => {})}
                  readOnly={!onToggleAll}
                />
              </th>
            )}
            {columns.map((column) => (
              <th 
                key={column.key}
                className={cn(
                  "px-5 py-3 text-[12px] font-bold text-text-secondary uppercase tracking-wider",
                  column.align === 'right' && "text-right",
                  column.align === 'center' && "text-center",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (showCheckboxes ? 1 : 0)} className="px-6 py-20 text-center text-sm text-text-secondary">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-12 h-12 bg-bg-light rounded-md flex items-center justify-center text-slate-300">
                      <Search size={24} />
                   </div>
                   <p className="font-medium text-slate-400">No records found matching your criteria.</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr 
                key={item.id} 
                className={cn(
                  "hover:bg-slate-50 transition-colors group cursor-default",
                  onRowClick && "cursor-pointer",
                  selectedRows.includes(item.id) && "bg-primary/5"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {showCheckboxes && (
                   <td className="px-5 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded-sm border-border text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer" 
                      checked={selectedRows.includes(item.id)}
                      onChange={() => onToggleRow ? onToggleRow(item.id) : undefined}
                      readOnly={!onToggleRow}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td 
                    key={column.key}
                    className={cn(
                      "px-5 py-3 text-[13.5px] text-text-primary",
                      column.align === 'right' && "text-right",
                      column.align === 'center' && "text-center",
                      column.className
                    )}
                  >
                    {column.render ? column.render(item) : (item as any)[column.key]}
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

import { Search } from 'lucide-react';
