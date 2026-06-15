import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { usuarios, userPublic } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { UserCreateSchema, UserUpdateSchema } from '@mini-jira/shared';

const router = Router();

router.get('/', authenticate, (_req: Request, res: Response) => {
  const sorted = [...usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre));
  res.json(sorted.map(userPublic));
});

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const parsed = UserCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', message: parsed.error.flatten() });
    return;
  }

  const { nombre, email, password, rol } = parsed.data;
  if (usuarios.find((u) => u.email === email)) {
    res.status(409).json({ error: 'conflict', message: 'El email ya está registrado' });
    return;
  }

  const now = new Date();
  const user = {
    id: crypto.randomUUID(),
    nombre,
    email,
    password_hash: await bcrypt.hash(password, 12),
    rol,
    activo: true,
    creado_en: now,
    actualizado_en: now,
  };

  usuarios.push(user);
  res.status(201).json(userPublic(user));
});

router.patch('/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const parsed = UserUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', message: parsed.error.flatten() });
    return;
  }

  const idx = usuarios.findIndex((u) => u.id === req.params['id']);
  if (idx === -1) { res.status(404).json({ error: 'not_found', message: 'Usuario no encontrado' }); return; }

  usuarios[idx] = { ...usuarios[idx]!, ...parsed.data, actualizado_en: new Date() };
  res.json(userPublic(usuarios[idx]!));
});

export default router;
