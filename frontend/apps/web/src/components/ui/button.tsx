import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'subtle' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 rounded font-sans font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
      primary: 'bg-primary-container text-on-primary hover:opacity-90',
      subtle: 'bg-transparent text-on-surface-variant hover:bg-surface-container',
      destructive: 'bg-error text-on-error hover:opacity-90',
      ghost: 'bg-transparent text-on-surface hover:bg-surface-container',
    };
    const sizes = {
      sm: 'text-label-lg px-3 py-1.5',
      md: 'text-title-md px-4 py-2',
      lg: 'text-title-lg px-6 py-3',
    };
    return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
  },
);
Button.displayName = 'Button';
