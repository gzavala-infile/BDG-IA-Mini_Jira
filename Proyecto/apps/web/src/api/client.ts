import { useAuthStore } from '@/store/authStore';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function refreshAccessToken(): Promise<string | null> {
  const rt = localStorage.getItem('refreshToken');
  if (!rt) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string };
  useAuthStore.getState().setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = useAuthStore.getState().accessToken;

  const doFetch = (t: string | null) =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });

  let res = await doFetch(token);

  if (res.status === 401 && token) {
    token = await refreshAccessToken();
    if (!token) {
      useAuthStore.getState().clearAuth();
      throw new Error('SESSION_EXPIRED');
    }
    res = await doFetch(token);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error((body as { message?: string }).message ?? 'Error'), { statusCode: res.status, body });
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
