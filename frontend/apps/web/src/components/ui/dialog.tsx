import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function DialogContent({ children, className, title }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-inverse-surface/40 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'bg-surface-container-lowest rounded-lg shadow-card-drag border border-outline-variant',
          'w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
      >
        {title && (
          <RadixDialog.Title className="font-heading text-headline-md text-on-surface mb-4">{title}</RadixDialog.Title>
        )}
        <RadixDialog.Close className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface">
          <X size={18} />
        </RadixDialog.Close>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
