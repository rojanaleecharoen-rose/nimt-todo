import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

const app = createApp();

describe('Todos API — skeleton seam', () => {
  beforeAll(async () => {
    // Fail fast if the real test DB is unreachable / not migrated.
    await prisma.$queryRaw`SELECT 1`;
  });

  // Reset the DB between runs so every test starts from an empty `todos` table.
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "todos" RESTART IDENTITY CASCADE');
  });

  describe('GET /health', () => {
    it('returns 200 with a status payload', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /todos', () => {
    it('returns an empty list against the real test DB', async () => {
      const res = await request(app).get('/todos');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns persisted todos in creation order', async () => {
      await prisma.todo.create({ data: { title: 'First' } });
      await prisma.todo.create({ data: { title: 'Second' } });

      const res = await request(app).get('/todos');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((t: { title: string }) => t.title)).toEqual(['First', 'Second']);
    });
  });

  describe('POST /todos', () => {
    it('creates a todo with defaults', async () => {
      const res = await request(app).post('/todos').send({ title: 'Buy milk' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Buy milk');
      expect(res.body.done).toBe(false);
      expect(res.body.color).toBeNull();
    });

    it('creates a todo with an explicit color', async () => {
      const res = await request(app).post('/todos').send({ title: 'Mint note', color: 'mint' });

      expect(res.status).toBe(201);
      expect(res.body.color).toBe('mint');
    });

    it('rejects an empty title with 400', async () => {
      const res = await request(app).post('/todos').send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects an invalid color with 400', async () => {
      const res = await request(app).post('/todos').send({ title: 'x', color: 'neon' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PATCH /todos/:id', () => {
    it('updates a todo', async () => {
      const todo = await prisma.todo.create({ data: { title: 'Edit me' } });

      const res = await request(app).patch(`/todos/${todo.id}`).send({ done: true, title: 'Edited' });

      expect(res.status).toBe(200);
      expect(res.body.done).toBe(true);
      expect(res.body.title).toBe('Edited');
    });

    it('persists a title update in the database', async () => {
      const todo = await prisma.todo.create({ data: { title: 'Old title' } });

      const res = await request(app).patch(`/todos/${todo.id}`).send({ title: 'New title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New title');

      const persisted = await prisma.todo.findUnique({ where: { id: todo.id } });
      expect(persisted?.title).toBe('New title');
    });

    it('rejects an empty title with a structured 400', async () => {
      const todo = await prisma.todo.create({ data: { title: 'x' } });

      const res = await request(app).patch(`/todos/${todo.id}`).send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.fieldErrors.title).toEqual(['title must not be empty']);
    });

    it('rejects an empty body with 400', async () => {
      const todo = await prisma.todo.create({ data: { title: 'x' } });

      const res = await request(app).patch(`/todos/${todo.id}`).send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 404 for a missing todo', async () => {
      const res = await request(app).patch(`/todos/${randomUUID()}`).send({ done: true });
      expect(res.status).toBe(404);
    });

    it('persists toggling done in the database', async () => {
      const todo = await prisma.todo.create({ data: { title: 'Toggle me' } });
      expect(todo.done).toBe(false);

      const res = await request(app).patch(`/todos/${todo.id}`).send({ done: true });

      expect(res.status).toBe(200);
      expect(res.body.done).toBe(true);

      const persisted = await prisma.todo.findUnique({ where: { id: todo.id } });
      expect(persisted?.done).toBe(true);
    });

    it('persists reopening a done todo', async () => {
      const todo = await prisma.todo.create({ data: { title: 'Reopen me', done: true } });

      const res = await request(app).patch(`/todos/${todo.id}`).send({ done: false });

      expect(res.status).toBe(200);
      expect(res.body.done).toBe(false);

      const persisted = await prisma.todo.findUnique({ where: { id: todo.id } });
      expect(persisted?.done).toBe(false);
    });
  });

  describe('DELETE /todos/:id', () => {
    it('deletes a todo', async () => {
      const todo = await prisma.todo.create({ data: { title: 'delete me' } });

      const res = await request(app).delete(`/todos/${todo.id}`);
      expect(res.status).toBe(204);

      const remaining = await prisma.todo.count();
      expect(remaining).toBe(0);
    });

    it('returns 404 for a missing todo', async () => {
      const res = await request(app).delete(`/todos/${randomUUID()}`);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /todos?completed=true', () => {
    it('removes only completed todos and leaves incomplete ones', async () => {
      await prisma.todo.create({ data: { title: 'Done one', done: true } });
      await prisma.todo.create({ data: { title: 'Done two', done: true } });
      await prisma.todo.create({ data: { title: 'Still active' } });

      const res = await request(app).delete('/todos?completed=true');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: 2 });

      const remaining = await prisma.todo.findMany({ orderBy: { title: 'asc' } });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('Still active');
      expect(remaining[0].done).toBe(false);
    });

    it('persists the clear in the database', async () => {
      await prisma.todo.create({ data: { title: 'Doomed', done: true } });
      await prisma.todo.create({ data: { title: 'Survivor' } });

      await request(app).delete('/todos?completed=true');

      const survivor = await prisma.todo.findFirst({ where: { title: 'Survivor' } });
      expect(survivor).not.toBeNull();
      const doomed = await prisma.todo.findFirst({ where: { title: 'Doomed' } });
      expect(doomed).toBeNull();
    });

    it('returns deleted: 0 when there are no completed todos', async () => {
      await prisma.todo.create({ data: { title: 'Active only' } });

      const res = await request(app).delete('/todos?completed=true');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: 0 });
      expect(await prisma.todo.count()).toBe(1);
    });

    it('rejects a bare DELETE /todos without the completed flag', async () => {
      const res = await request(app).delete('/todos');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
