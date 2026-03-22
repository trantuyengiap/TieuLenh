import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { signAccessToken } from '../services/tokenService.js';
import { createHttpError } from '../utils/httpError.js';
import { pickUserSafeFields } from '../utils/pick.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6).max(100),
  newPassword: z.string().min(8).max(100),
});

function setAuthCookie(res, token) {
  res.cookie('accessToken', token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  });
}

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.body.username } });
    if (!user || user.status !== 'ACTIVE') {
      throw createHttpError(401, 'Username or password is incorrect');
    }

    const matched = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!matched) {
      throw createHttpError(401, 'Username or password is incorrect');
    }

    const token = signAccessToken({ sub: user.id, role: user.role });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    setAuthCookie(res, token);
    res.json({ user: pickUserSafeFields({ ...user, lastLoginAt: new Date() }) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: pickUserSafeFields(req.user) });
});

router.post('/change-password', requireAuth, validate(passwordSchema), async (req, res, next) => {
  try {
    const matched = await bcrypt.compare(req.body.currentPassword, req.user.passwordHash);
    if (!matched) {
      throw createHttpError(400, 'Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(req.body.newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
