import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded border-2 border-outline-variant bg-surface-container-lowest px-3 py-2',
      'text-body-md text-on-surface placeholder:text-on-surface-variant',
      'focus:border-primary-container focus:outline-none',
      'disabled:bg-surface-container disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
