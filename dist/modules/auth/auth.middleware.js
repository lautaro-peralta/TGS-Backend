import jwt from 'jsonwebtoken';
import { Rol } from './usuario.entity.js';
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token proporcionado' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}
export function adminMiddleware(req, res, next) {
    const user = req.user;
    if (!user)
        return res.status(401).json({ message: 'No autenticado' });
    if (user.rol !== Rol.ADMIN) {
        return res.status(403).json({ message: 'No autorizado: se requiere rol ADMIN' });
    }
    next();
}
//# sourceMappingURL=auth.middleware.js.map