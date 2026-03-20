import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createHttpError } from '../utils/httpError.js';

const router = Router();

const commandSchema = z.object({
  title: z.string().min(3).max(120),
  position: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  employeeId: z.string().optional().nullable(),
  items: z.array(z.object({ content: z.string().min(1).max(500) })).min(1),
});

router.get('/', async (_req, res) => {
  const commandSets = await prisma.commandSet.findMany({
    include: {
      employee: true,
      items: { orderBy: { orderIndex: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(commandSets);
});

router.post('/', requireRole('SUPERADMIN', 'ADMIN'), validate(commandSchema), async (req, res, next) => {
  try {
    const commandSet = await prisma.commandSet.create({
      data: {
        title: req.body.title,
        position: req.body.position || null,
        description: req.body.description || null,
        employeeId: req.body.employeeId || null,
        items: {
          create: req.body.items.map((item, index) => ({
            content: item.content,
            orderIndex: index + 1,
          })),
        },
      },
      include: { items: true, employee: true },
    });
    res.status(201).json(commandSet);
  } catch (error) {
    next(createHttpError(400, 'Failed to create command set', error.message));
  }
});

router.put('/:id', requireRole('SUPERADMIN', 'ADMIN'), validate(commandSchema), async (req, res, next) => {
  try {
    await prisma.commandItem.deleteMany({ where: { commandSetId: req.params.id } });
    const commandSet = await prisma.commandSet.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        position: req.body.position || null,
        description: req.body.description || null,
        employeeId: req.body.employeeId || null,
        items: {
          create: req.body.items.map((item, index) => ({
            content: item.content,
            orderIndex: index + 1,
          })),
        },
      },
      include: { items: true, employee: true },
    });
    res.json(commandSet);
  } catch (error) {
    next(createHttpError(404, 'Command set not found', error.message));
  }
});

router.delete('/:id', requireRole('SUPERADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    await prisma.commandSet.delete({ where: { id: req.params.id } });
    res.json({ message: 'Command set deleted successfully' });
  } catch (error) {
    next(createHttpError(404, 'Command set not found', error.message));
  }
});

export default router;
