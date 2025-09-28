import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from './user.entity.js';

interface TokenPayload extends JwtPayload {
  id: number;
  roles: string[];
}

const JWT_SECRET = process.env.JWT_SECRET || 'ultra-secure-secret';

/*export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  console.log('🛡️ [authMiddleware] Authorization Header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ [authMiddleware] No token provided or invalid format');
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔐 [authMiddleware] Token extracted:', token);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = {
      id: payload.id,
      roles: payload.roles,
    };
    next();
  } catch (error) {
    console.error('❌ [authMiddleware] Invalid or expired token:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
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

  console.log('🛡️ [authMiddleware] Token from cookies:', token);

  if (!token) {
    console.warn("⚠️ [authMiddleware] Cookie 'access_token' not found");
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    console.log('✅ [authMiddleware] Valid token, payload:', payload);

    req.user = {
      id: payload.id,
      roles: payload.roles,
    };

    return next();
  } catch (error) {
    console.error('❌ [authMiddleware] Invalid or expired token:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function rolesMiddleware(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.roles) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const hasRole = user.roles.some((role: Role) =>
      allowedRoles.includes(role)
    );

    if (!hasRole) {
      return res
        .status(403)
        .json({ message: 'You do not have permission to access this resource' });
    }

    next();
  };
}
