import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/board" replace />;

  return <>{children}</>;
}
