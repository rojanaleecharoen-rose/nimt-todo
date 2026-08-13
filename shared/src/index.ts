import { z } from 'zod';

/**
 * The single source of truth for the pastel palette.
 * The UI palette and the `color` enum both derive from this list.
 * Keep in sync with the `Color` enum in server/prisma/schema.prisma.
 */
export const PASTEL_COLORS = [
  'mint',
  'sky',
  'lavender',
  'peach',
  'rose',
  'butter',
] as const;

export const pastelColorSchema = z.enum(PASTEL_COLORS);
export type PastelColor = z.infer<typeof pastelColorSchema>;

/** Zod schema for a full Todo as it exists in the database. */
export const todoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'title must not be empty'),
  done: z.boolean().default(false),
  color: pastelColorSchema.nullable().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Todo = z.infer<typeof todoSchema>;

/** Zod schema for creating a new todo (request body for POST /todos). */
export const createTodoSchema = z.object({
  title: z.string().min(1, 'title must not be empty'),
  color: pastelColorSchema.optional(),
});
export type CreateTodoInput = z.infer<typeof createTodoSchema>;

/** Zod schema for updating an existing todo (request body for PATCH /todos/:id). */
export const updateTodoSchema = z
  .object({
    title: z.string().min(1, 'title must not be empty').optional(),
    done: z.boolean().optional(),
    color: pastelColorSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'at least one field must be provided',
  });
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
