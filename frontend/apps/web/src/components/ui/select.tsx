import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'w-full rounded border-2 border-outline-variant bg-surface-container-lowest px-3 py-2',
      'text-body-md text-on-surface',
      'focus:border-primary-container focus:outline-none',
      'disabled:bg-surface-container disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
