import { Router, Request, Response } from 'express';
import { tickets, usuarios, userPublic } from '../lib/db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (req: Request, res: Response) => {
  const now = new Date();
  const mes = Number((req.query as Record<string, string>)['mes'] ?? now.getMonth() + 1);
  const anio = Number((req.query as Record<string, string>)['anio'] ?? now.getFullYear());

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 1);

  const activos = tickets.filter((t) => t.archived_at === null);
  const enPeriodo = activos.filter((t) => t.creado_en >= inicio && t.creado_en < fin);

  const tickets_creados = enPeriodo.length;
  const tickets_listos = enPeriodo.filter((t) => t.estado === 'listo').length;

  const estados = ['por_hacer', 'en_progreso', 'bloqueado', 'listo'] as const;
  const distribucion_por_estado = estados.map((estado) => ({
    estado,
    total: activos.filter((t) => t.estado === estado).length,
  }));

  const listosEnPeriodo = activos.filter(
    (t) => t.estado === 'listo' && t.creado_en >= inicio && t.creado_en < fin && t.asignado_a_id !== null,
  );

  const porUsuarioMap = new Map<string, number>();
  for (const t of listosEnPeriodo) {
    const uid = t.asignado_a_id!;
    porUsuarioMap.set(uid, (porUsuarioMap.get(uid) ?? 0) + 1);
  }

  const tickets_listos_por_usuario = Array.from(porUsuarioMap.entries()).map(([uid, total]) => ({
    usuario: userPublic(usuarios.find((u) => u.id === uid)!),
    total,
  }));

  res.json({ mes, anio, tickets_creados, tickets_listos, distribucion_por_estado, tickets_listos_por_usuario });
});

export default router;
