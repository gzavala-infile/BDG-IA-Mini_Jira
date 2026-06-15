import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoginSchema, type LoginInput } from '@mini-jira/shared';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AuthTokens } from '@mini-jira/shared';
import { useState } from 'react';

export function LoginForm() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError('');
    try {
      const res = await apiFetch<AuthTokens>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      setAuth(res.user, res.accessToken, res.refreshToken);
      const returnTo = searchParams.get('returnTo') ?? '/board';
      navigate(returnTo, { replace: true });
    } catch {
      setServerError('Credenciales incorrectas. Verifica tu email y contraseña.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">Email</label>
        <Input type="email" placeholder="tu@empresa.com" {...register('email')} />
        {errors.email && <p className="text-label-md text-error mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">Contraseña</label>
        <Input type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-label-md text-error mt-1">{errors.password.message}</p>}
      </div>

      {serverError && (
        <p className="text-label-lg text-on-error-container bg-error-container rounded px-3 py-2">{serverError}</p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
