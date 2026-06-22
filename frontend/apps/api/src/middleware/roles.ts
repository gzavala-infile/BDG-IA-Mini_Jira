import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.rol !== 'admin') {
    res.status(403).json({ error: 'forbidden', message: 'Se requiere rol Admin' });
    return;
  }
  next();
}
