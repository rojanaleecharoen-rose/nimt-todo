import { PrismaClient } from '@prisma/client';

/**
 * Shared PrismaClient instance.
 * Tests point this at the test database by setting `DATABASE_URL` to the test
 * URL in the Vitest setup file (which runs before this module is imported).
 */
export const prisma = new PrismaClient();
