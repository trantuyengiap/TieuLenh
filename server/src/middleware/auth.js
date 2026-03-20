import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../services/tokenService.js';
import { createHttpError } from '../utils/httpError.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.accessToken;
    if (!token) {
      throw createHttpError(401, 'Authentication required');
    }

    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw createHttpError(401, 'Invalid account or account is locked');
    }

    req.user = user;
    next();
  } catch (error) {
    next(createHttpError(error.status || 401, error.message || 'Invalid token'));
  }
}

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(createHttpError(401, 'Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(createHttpError(403, 'Insufficient permission'));
    }
    next();
  };
}
