import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usuarios, refreshTokens } from '../lib/db';
import { LoginSchema } from '@mini-jira/shared';
import { authenticate } from '../middleware/auth';
import { JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES } from '@mini-jira/shared';

const router = Router();

function signAccess(userId: string, rol: string): string {
  return jwt.sign({ userId, rol }, process.env['JWT_SECRET'] ?? 'dev-secret', {
    expiresIn: JWT_ACCESS_EXPIRES,
  } as jwt.SignOptions);
}

function signRefresh(userId: string): string {
  return jwt.sign({ userId }, process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret', {
    expiresIn: JWT_REFRESH_EXPIRES,
  } as jwt.SignOptions);
}

router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', message: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const user = usuarios.find((u) => u.email === email);

  if (!user || !user.activo || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'invalid_credentials', message: 'Credenciales incorrectas' });
    return;
  }

  const accessToken = signAccess(user.id, user.rol);
  const refreshToken = signRefresh(user.id);

  refreshTokens.push({
    id: crypto.randomUUID(),
    token: refreshToken,
    usuario_id: user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    creado_en: new Date(),
  });

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
  });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(401).json({ error: 'unauthorized', message: 'Refresh token requerido' });
    return;
  }

  try {
    const payload = jwt.verify(refreshToken, process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret') as { userId: string };
    const stored = refreshTokens.find((t) => t.token === refreshToken);

    if (!stored || stored.expires_at < new Date()) {
      res.status(401).json({ error: 'unauthorized', message: 'Refresh token inválido' });
      return;
    }

    const user = usuarios.find((u) => u.id === payload.userId);
    if (!user || !user.activo) {
      res.status(401).json({ error: 'unauthorized', message: 'Usuario inactivo' });
      return;
    }

    res.json({ accessToken: signAccess(user.id, user.rol) });
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Refresh token inválido' });
  }
});

router.post('/logout', authenticate, (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    const idx = refreshTokens.findIndex((t) => t.token === refreshToken);
    if (idx !== -1) refreshTokens.splice(idx, 1);
  }
  res.status(204).send();
});

export default router;
