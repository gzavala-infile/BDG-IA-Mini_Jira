import { useUiStore } from '@/store/uiStore';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-card-drag min-w-72 max-w-sm',
            t.variant === 'destructive'
              ? 'bg-error-container text-on-error-container border-error'
              : 'bg-surface-container-lowest text-on-surface border-outline-variant',
          )}
        >
          <div className="flex-1">
            <p className="text-title-md">{t.title}</p>
            {t.description && <p className="text-body-md text-on-surface-variant mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-on-surface-variant hover:text-on-surface mt-0.5">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
