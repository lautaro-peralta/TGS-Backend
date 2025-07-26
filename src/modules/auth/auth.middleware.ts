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
  console.log('🛡️ [authMiddleware] Authorization Header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ [authMiddleware] No token proporcionado o formato inválido');
    return res.status(401).json({ message: 'No token proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔐 [authMiddleware] Token extraído:', token);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log('✅ [authMiddleware] Payload decodificado:', payload);
    (req as any).user = payload;
    next();
  } catch (error) {
    console.error('❌ [authMiddleware] Token inválido o expirado:', error);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JwtPayload | undefined;
  console.log('👤 [adminMiddleware] Usuario autenticado:', user);

  if (!user) {
    console.warn('⚠️ [adminMiddleware] No autenticado');
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (user.rol !== Rol.ADMIN) {
    console.warn('⛔ [adminMiddleware] Acceso denegado. Rol requerido: ADMIN');
    return res.status(403).json({ message: 'No autorizado: se requiere rol ADMIN' });
  }

  console.log('✅ [adminMiddleware] Acceso autorizado para ADMIN');
  next();
}
