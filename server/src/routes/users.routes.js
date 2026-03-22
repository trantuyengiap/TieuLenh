import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createHttpError } from '../utils/httpError.js';
import { pickUserSafeFields } from '../utils/pick.js';

const router = Router();

const createSchema = z.object({
  username: z.string().min(3).max(50),
  fullName: z.string().min(3).max(100),
  password: z.string().min(8).max(100),
  role: z.nativeEnum(Role),
  status: z.enum(['ACTIVE', 'LOCKED']).default('ACTIVE'),
});

const updateSchema = z.object({
  fullName: z.string().min(3).max(100),
  role: z.nativeEnum(Role),
  status: z.enum(['ACTIVE', 'LOCKED']),
});

const passwordResetSchema = z.object({
  password: z.string().min(8).max(100),
});

router.use(requireRole('SUPERADMIN', 'ADMIN'));

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users.map(pickUserSafeFields));
});

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { username: req.body.username } });
    if (existing) {
      throw createHttpError(409, 'Username already exists');
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        username: req.body.username,
        fullName: req.body.fullName,
        passwordHash,
        role: req.body.role,
        status: req.body.status,
      },
    });

    res.status(201).json(pickUserSafeFields(user));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(pickUserSafeFields(user));
  } catch (error) {
    next(createHttpError(404, 'User not found', error.message));
  }
});

router.patch('/:id/password', validate(passwordResetSchema), async (req, res, next) => {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(createHttpError(404, 'User not found', error.message));
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(createHttpError(404, 'User not found', error.message));
  }
});

export default router;
