import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin text-institutional-black',
        sizeClasses[size],
        className
      )}
    />
  );
}

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md',
  className 
}: LoadingStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-8 gap-4',
      className
    )}>
      <LoadingSpinner size={size} />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );
}

interface TableLoadingProps {
  columns: number;
  rows?: number;
  className?: string;
}

export function TableLoading({ columns, rows = 5, className }: TableLoadingProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex space-x-4 py-3">
          {Array.from({ length: columns }, (_, j) => (
            <div 
              key={j} 
              className="h-4 bg-gray-200 rounded flex-1"
              style={{ 
                animationDelay: `${(i * columns + j) * 0.1}s` 
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({ message = 'Loading...', className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-gray-600', className)}>
      <LoadingSpinner size="sm" />
      <span>{message}</span>
    </div>
  );
}

interface CardLoadingProps {
  title?: boolean;
  lines?: number;
  className?: string;
}

export function CardLoading({ title = true, lines = 3, className }: CardLoadingProps) {
  return (
    <div className={cn('animate-pulse p-4 space-y-3', className)}>
      {title && <div className="h-6 bg-gray-200 rounded w-3/4" />}
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}