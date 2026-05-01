import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-[13px] font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-[13px] text-slate-900",
          "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all",
          "placeholder:text-slate-400",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
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
      {label && (
        <label className="text-[13px] font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        className={cn(
          "w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-[13px] text-slate-900",
          "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all",
          "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2364748b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_8px_center] bg-no-repeat pr-9",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  );
}
