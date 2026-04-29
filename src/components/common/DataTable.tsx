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
  className 
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            {columns.map((column) => (
              <th 
                key={column.key}
                className={cn(
                  "px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider",
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
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-20 text-center text-sm text-slate-400">
                No records found matching your criteria.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr 
                key={item.id} 
                className={cn(
                  "hover:bg-slate-50 transition-colors group cursor-default",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td 
                    key={column.key}
                    className={cn(
                      "px-6 py-4 text-sm text-slate-600",
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
