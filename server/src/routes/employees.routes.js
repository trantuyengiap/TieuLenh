import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createHttpError } from '../utils/httpError.js';

const router = Router();

const employeeSchema = z.object({
  employeeCode: z.string().min(2).max(30),
  fullName: z.string().min(3).max(100),
  rank: z.string().max(50).optional().or(z.literal('')),
  position: z.string().max(100).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

router.get('/', async (_req, res) => {
  const employees = await prisma.employee.findMany({
    include: {
      commandSets: { include: { items: { orderBy: { orderIndex: 'asc' } } } },
      results: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(employees);
});

router.post('/', requireRole('SUPERADMIN', 'ADMIN'), validate(employeeSchema), async (req, res, next) => {
  try {
    const employee = await prisma.employee.create({ data: req.body });
    res.status(201).json(employee);
  } catch (error) {
    next(createHttpError(400, 'Failed to create employee', error.message));
  }
});

router.put('/:id', requireRole('SUPERADMIN', 'ADMIN'), validate(employeeSchema), async (req, res, next) => {
  try {
    const employee = await prisma.employee.update({ where: { id: req.params.id }, data: req.body });
    res.json(employee);
  } catch (error) {
    next(createHttpError(404, 'Employee not found', error.message));
  }
});

router.delete('/:id', requireRole('SUPERADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    next(createHttpError(404, 'Employee not found', error.message));
  }
});

export default router;
