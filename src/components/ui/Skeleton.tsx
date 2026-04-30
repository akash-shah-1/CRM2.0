import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-slate-200",
        variant === 'circle' ? "rounded-full" : "rounded-lg",
        className
      )} 
    />
  );
}
