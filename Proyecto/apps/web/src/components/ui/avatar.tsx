import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  nombre: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Avatar({ nombre, size = 'sm', className }: AvatarProps) {
  const sizes = { sm: 'w-6 h-6 text-label-md', md: 'w-8 h-8 text-label-lg' };
  return (
    <span
      className={cn('rounded-full bg-primary-container text-on-primary-container inline-flex items-center justify-center font-semibold select-none', sizes[size], className)}
      title={nombre}
    >
      {getInitials(nombre)}
    </span>
  );
}
