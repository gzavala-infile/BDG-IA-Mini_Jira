import { cn } from '@/lib/utils';

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
}

export function Badge({ className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-xl px-2 py-0.5 text-label-lg', className)}>
      {children}
    </span>
  );
}
