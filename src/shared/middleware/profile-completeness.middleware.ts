// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { User } from '../../modules/auth/user/user.entity.js';
import { orm } from '../../shared/db/orm.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import logger from '../../shared/utils/logger.js';

// ============================================================================
// PROFILE COMPLETENESS (sin verificación por admin)
// ============================================================================

function computeProfileCompleteness(u: User): number {
  let completed = 0;
  const total = 4; // username, email, emailVerified, hasPersonalInfo

  if (u.username) completed++;                 // 1
  if (u.email) completed++;                    // 2
  if ((u as any).emailVerified) completed++;   // 3
  if ((u as any).hasPersonalInfo) completed++; // 4

  return Math.round((completed / total) * 100);
}

/**
 * Middleware principal: recalcula/comprueba porcentaje y lo adjunta a req.
 * (Opcional) Persiste profileCompleteness si existe en la entidad.
 */
export async function requireProfileCompleteness(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const em = orm.em.fork();

  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return ResponseUtil.unauthorized(res, 'Not authenticated');
    }

    const user = await em.findOne(User, { id: authUser.id });
    if (!user) {
      return ResponseUtil.notFound(res, 'User', authUser.id);
    }

    const percent = computeProfileCompleteness(user);

    // (Opcional) guarda en DB si el campo existe
    if (typeof (user as any).profileCompleteness === 'number') {
      (user as any).profileCompleteness = percent;
      await em.flush();
    }

    (req as any).profileCompleteness = percent;
    return next();
  } catch (err) {
    logger.error({ err }, '[requireActionPermission] error');
    return ResponseUtil.internalError(res, 'Profile completeness check failed');
  }
}

// ============================================================================
// EXTRA MIDDLEWARES QUE USABA auth.middleware.ts
// ============================================================================

/**
 * Requisito mínimo de cliente para poder comprar:
 * - email verificado
 * - datos personales completos
 * (No exigimos verificación por admin)
 */
export async function requireClientCanPurchase(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const em = orm.em.fork();

  try {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      return ResponseUtil.unauthorized(res, 'Not authenticated');
    }

    const user = await em.findOne(User, { id: authUser.id });
    if (!user) {
      return ResponseUtil.notFound(res, 'User', authUser.id);
    }

    const emailVerified = (user as any).emailVerified === true;
    const hasPersonalInfo = (user as any).hasPersonalInfo === true;

    if (!emailVerified) {
      return ResponseUtil.forbidden(res, 'Debes verificar tu email para continuar');
    }
    if (!hasPersonalInfo) {
      return ResponseUtil.forbidden(res, 'Completa tus datos personales para continuar');
    }

    return next();
  } catch (err) {
    logger.error({ err }, '[requireActionPermission] error');
    return ResponseUtil.internalError(res, 'Purchase requirement check failed');
  }
}

/**
 * Control de permisos por acción.
 * - Si action === 'ADMIN_ONLY' exige rol ADMIN.
 * - Para otras acciones, por defecto deja pasar (ajustá a tus necesidades).
 */
export function requireActionPermission(action: string) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = (req as any).user;
      if (!authUser?.id) {
        return ResponseUtil.unauthorized(res, 'Not authenticated');
      }

      // Si pedís ADMIN_ONLY verificamos rol
      if (action === 'ADMIN_ONLY') {
        const roles: string[] = (authUser.roles ?? []) as string[];
        if (!roles.includes('ADMIN')) {
          return ResponseUtil.forbidden(res, 'Requiere rol ADMIN');
        }
      }

      // Para otras acciones, por ahora no restringimos
      return next();
    } catch (err) {
      logger.error({ err }, '[requireActionPermission] error');
      return ResponseUtil.internalError(res, 'Permission check failed');
    }
  };
}
