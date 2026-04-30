import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[12px] font-semibold text-text-primary">{label}</label>}
      <input
        className={cn(
          "w-full px-3 py-2 bg-white border border-border rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none placeholder:text-slate-400",
          error && "border-danger focus:border-danger focus:ring-danger/10",
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-danger font-medium">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
  error?: string;
}

export function Select({ label, options, error, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[12px] font-semibold text-text-primary">{label}</label>}
      <select
        className={cn(
          "w-full px-3 py-2 bg-white border border-border rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all text-text-primary outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23878a99%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_8px_center] bg-no-repeat",
          error && "border-danger focus:border-danger focus:ring-danger/10",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-[11px] text-danger font-medium">{error}</p>}
    </div>
  );
}
