import { ResultStatus, SessionStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { setLedState, getLedState } from '../services/ledStateService.js';
import { emitSessionUpdate, emitStatsUpdate } from '../services/realtimeService.js';
import { createHttpError } from '../utils/httpError.js';

const router = Router();

const startSchema = z.object({
  sessionName: z.string().min(3).max(120),
  mode: z.enum(['random', 'manual']),
  employeeId: z.string().min(1),
  commandSetId: z.string().min(1),
});

const resultSchema = z.object({
  employeeId: z.string().min(1),
  commandSetId: z.string().optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  resultStatus: z.nativeEnum(ResultStatus),
  evaluatorNote: z.string().max(500).optional().or(z.literal('')),
});

router.get('/', async (_req, res) => {
  const sessions = await prisma.drillSession.findMany({
    include: {
      results: {
        include: {
          employee: true,
          commandSet: { include: { items: { orderBy: { orderIndex: 'asc' } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(sessions);
});

router.get('/current', async (_req, res) => {
  const ledState = await getLedState();
  res.json({ ledState });
});

router.post('/start', requireRole('SUPERADMIN', 'ADMIN'), validate(startSchema), async (req, res, next) => {
  try {
    const [employee, commandSet] = await Promise.all([
      prisma.employee.findUnique({ where: { id: req.body.employeeId } }),
      prisma.commandSet.findUnique({
        where: { id: req.body.commandSetId },
        include: { items: { orderBy: { orderIndex: 'asc' } } },
      }),
    ]);

    if (!employee || !commandSet) {
      throw createHttpError(404, 'Employee or command set not found');
    }

    const session = await prisma.drillSession.create({
      data: {
        sessionName: req.body.sessionName,
        mode: req.body.mode,
        status: SessionStatus.LIVE,
        selectedEmployeeId: employee.id,
        selectedCommandSetId: commandSet.id,
        startedAt: new Date(),
        ledPayload: {
          status: 'live',
          sessionName: req.body.sessionName,
          employee,
          commandSet,
          updatedAt: new Date().toISOString(),
        },
      },
      include: {
        results: true,
      },
    });

    const ledState = await setLedState({
      status: 'live',
      sessionId: session.id,
      sessionName: session.sessionName,
      employee,
      commandSet,
      updatedAt: new Date().toISOString(),
    });

    emitSessionUpdate({ type: 'started', sessionId: session.id, ledState });
    res.status(201).json({ session, ledState });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/result', requireRole('SUPERADMIN', 'ADMIN'), validate(resultSchema), async (req, res, next) => {
  try {
    const result = await prisma.sessionResult.upsert({
      where: {
        sessionId_employeeId: {
          sessionId: req.params.id,
          employeeId: req.body.employeeId,
        },
      },
      update: {
        commandSetId: req.body.commandSetId || null,
        score: req.body.score ?? null,
        resultStatus: req.body.resultStatus,
        evaluatorNote: req.body.evaluatorNote || null,
      },
      create: {
        sessionId: req.params.id,
        employeeId: req.body.employeeId,
        commandSetId: req.body.commandSetId || null,
        score: req.body.score ?? null,
        resultStatus: req.body.resultStatus,
        evaluatorNote: req.body.evaluatorNote || null,
      },
      include: {
        employee: true,
        commandSet: { include: { items: { orderBy: { orderIndex: 'asc' } } } },
      },
    });

    const session = await prisma.drillSession.update({
      where: { id: req.params.id },
      data: {
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
        ledPayload: {
          status: 'completed',
          sessionId: req.params.id,
          result,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    const ledState = await setLedState({
      status: 'completed',
      sessionId: session.id,
      result,
      updatedAt: new Date().toISOString(),
    });

    emitSessionUpdate({ type: 'completed', sessionId: session.id, result });
    emitStatsUpdate({ changedAt: new Date().toISOString() });
    res.json({ result, ledState });
  } catch (error) {
    next(createHttpError(400, 'Failed to save session result', error.message));
  }
});

router.post('/reset-led', requireRole('SUPERADMIN', 'ADMIN'), async (_req, res, next) => {
  try {
    const ledState = await setLedState({
      status: 'idle',
      sessionId: null,
      employee: null,
      commandSet: null,
      result: null,
      updatedAt: new Date().toISOString(),
    });
    emitSessionUpdate({ type: 'reset', ledState });
    res.json({ ledState });
  } catch (error) {
    next(error);
  }
});

export default router;
