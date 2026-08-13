import express from 'express';
import { todosRouter } from './routes/todos.js';

/**
 * Builds and returns the Express application.
 * Exported separately from the listen step so supertest integration tests can
 * drive it without opening a real port.
 */
export function createApp() {
  const app = express();

  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/todos', todosRouter);

  // Central error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
