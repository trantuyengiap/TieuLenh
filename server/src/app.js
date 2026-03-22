import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import employeesRoutes from './routes/employees.routes.js';
import commandsRoutes from './routes/commands.routes.js';
import sessionsRoutes from './routes/sessions.routes.js';
import statsRoutes from './routes/stats.routes.js';
import systemRoutes from './routes/system.routes.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', requireAuth, usersRoutes);
  app.use('/api/employees', requireAuth, employeesRoutes);
  app.use('/api/commands', requireAuth, commandsRoutes);
  app.use('/api/sessions', requireAuth, sessionsRoutes);
  app.use('/api/stats', requireAuth, statsRoutes);
  app.use('/api/system', requireAuth, systemRoutes);

  app.use(errorHandler);
  return app;
}
