import { Router, type Response } from 'express';
import { prisma } from '../db.js';
import { createTodoSchema, updateTodoSchema } from '@pastel-todo/shared';

/**
 * Structural shape of a Zod schema's `safeParse` result, so the shared schemas
 * can be validated here without the server declaring its own `zod` dependency
 * (zod lives in `shared`; the server only ever sees the result).
 */
interface SafeParsable<T> {
  safeParse(
    input: unknown,
  ): { success: true; data: T } | { success: false; error: { flatten(): unknown } };
}

/** Validate a request body; on failure respond 400 and return null. */
function parseOr400<T>(schema: SafeParsable<T>, body: unknown, res: Response): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

export const todosRouter = Router();

// GET /todos — list all todos. Returns [] when the DB is empty.
todosRouter.get('/', async (_req, res, next) => {
  try {
    const todos = await prisma.todo.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

// POST /todos — create a todo (validated with shared Zod schema).
todosRouter.post('/', async (req, res, next) => {
  try {
    const data = parseOr400(createTodoSchema, req.body, res);
    if (!data) return;

    const todo = await prisma.todo.create({
      data: {
        title: data.title,
        ...(data.color ? { color: data.color } : {}),
      },
    });
    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
});

// PATCH /todos/:id — update a todo.
todosRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = parseOr400(updateTodoSchema, req.body, res);
    if (!data) return;

    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data,
    });
    res.json(todo);
  } catch (err) {
    next(err);
  }
});

// DELETE /todos/:id — delete a single todo.
todosRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.todo.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
