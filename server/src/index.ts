import { config } from 'dotenv';
import { createApp } from './app.js';
import { prisma } from './db.js';

config();

const port = Number(process.env.PORT ?? 4000);

const app = createApp();

const server = app.listen(port, () => {
  console.log(`Pastel Todo API listening on http://localhost:${port}`);
});

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
