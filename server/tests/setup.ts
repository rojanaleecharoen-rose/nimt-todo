import { config } from 'dotenv';

// Load server/.env so TEST_DATABASE_URL is available.
config();

// Point Prisma at the real test database (docker-compose `test-db` service).
// This must run before the app / PrismaClient modules are imported so the client
// is constructed against the test DB, not the dev DB.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/pastel_todo_test';

export const TEST_DATABASE_URL = process.env.DATABASE_URL;
