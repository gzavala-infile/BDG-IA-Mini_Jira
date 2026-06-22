import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';

export function LoginPage() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/board" replace />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-lg shadow-card p-8">
        <h1 className="font-heading text-headline-lg text-on-surface mb-2">Mini Jira</h1>
        <p className="text-body-md text-on-surface-variant mb-6">Ingresa con tus credenciales</p>
        <LoginForm />
      </div>
    </div>
  );
}
