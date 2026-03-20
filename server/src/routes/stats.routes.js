import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [users, employees, commandSets, sessions, results] = await Promise.all([
    prisma.user.count(),
    prisma.employee.count(),
    prisma.commandSet.count(),
    prisma.drillSession.count(),
    prisma.sessionResult.findMany(),
  ]);

  const passed = results.filter((item) => item.resultStatus === 'PASSED').length;
  const failed = results.filter((item) => item.resultStatus === 'FAILED').length;
  const pending = results.filter((item) => item.resultStatus === 'PENDING').length;

  res.json({
    totals: {
      users,
      employees,
      commandSets,
      sessions,
      results: results.length,
    },
    outcomes: { passed, failed, pending },
  });
});

export default router;
