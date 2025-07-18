import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from './usuario.entity.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';

export interface JwtPayload {
  id: string;
  rol: Rol;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JwtPayload | undefined;
  if (!user) return res.status(401).json({ message: 'No autenticado' });

  if (user.rol !== Rol.ADMIN) {
    return res.status(403).json({ message: 'No autorizado: se requiere rol ADMIN' });
  }

  next();
}
