import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="font-heading text-display-sm text-on-surface-variant mb-2">404</p>
        <p className="text-headline-md text-on-surface mb-6">Página no encontrada</p>
        <Link to="/board"><Button>Ir al tablero</Button></Link>
      </div>
    </div>
  );
}
