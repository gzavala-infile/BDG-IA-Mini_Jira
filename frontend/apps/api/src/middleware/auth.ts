import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  rol: 'admin' | 'usuario';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Token requerido' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env['JWT_SECRET'] ?? '') as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Token inválido o expirado' });
  }
}
