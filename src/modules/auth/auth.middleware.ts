import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Rol } from './usuario.entity.js';

interface TokenPayload extends JwtPayload {
  id: number;
  roles: string[];
}

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';

/*export function authMiddleware(req: Request, res: Response, next: NextFunction) {
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
}*/

/*export function authMiddleware(req:Request,res:Response, next:NextFunction){
  const token= req.cookies.access_token
  req.session={user:null}
  try{
    const data = jwt.verify(token,JWT_SECRET)
    req.session.user = data
  }catch{}
  next()
}*/

export function authMiddleware(
  req: Request & {
    user?: { id: number; roles: string[] };
    cookies?: Record<string, string>;
  },
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.access_token;

  console.log('🛡️ [authMiddleware] Token desde cookies:', token);

  if (!token) {
    console.warn("⚠️ [authMiddleware] No se encontró cookie 'access_token'");
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    console.log('✅ [authMiddleware] Token válido, payload:', payload);

    req.user = {
      id: payload.id,
      roles: payload.roles,
    };

    return next();
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

    const tieneRol = user.roles.some((rol: Rol) =>
      rolesPermitidos.includes(rol)
    );

    if (!tieneRol) {
      return res
        .status(403)
        .json({ message: 'No tienes permisos para acceder a este recurso' });
    }

    next();
  };
}
