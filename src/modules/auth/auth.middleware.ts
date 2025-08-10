import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from './usuario.entity.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';

export interface JwtPayload {
  id: string;
  roles: Rol[];
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  console.log('🛡️ [authMiddleware] Authorization Header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ [authMiddleware] No token proporcionado o formato inválido');
    return res.status(401).json({ message: 'No token proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔐 [authMiddleware] Token extraído:', token);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = {
      id: payload.id,
      roles: payload.roles,
    };
    next();
  } catch (error) {
    console.error('❌ [authMiddleware] Token inválido o expirado:', error);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}


export function rolesMiddleware(rolesPermitidos: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.roles) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const tieneRol = user.roles.some((rol: Rol) => rolesPermitidos.includes(rol));

    if (!tieneRol) {
      return res.status(403).json({ message: 'No tienes permisos para acceder a este recurso' });
    }

    next();
  };
}
