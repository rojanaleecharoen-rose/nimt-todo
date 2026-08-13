import type { PastelColor, Todo, UpdateTodoInput } from '@pastel-todo/shared';

/**
 * Base URL for the API. When empty (the default in dev), requests go through
 * the Vite proxy configured in vite.config.ts. Set VITE_API_URL to point the
 * app at a different backend (e.g. http://localhost:3000) without a proxy.
 */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/** Shape of a validation error body from the server (`{ error: flatten() }`). */
interface ValidationErrorDetails {
  error?: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
}

/** Error thrown for non-OK API responses, carrying the HTTP status + body. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: ValidationErrorDetails | undefined;

  constructor(status: number, message: string, details?: ValidationErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Throws an ApiError for a non-OK response, parsing any structured validation
 * details from the body while tolerating non-JSON error bodies.
 */
async function throwApiError(res: Response, message: string): Promise<never> {
  let details: ValidationErrorDetails | undefined;
  try {
    details = (await res.json()) as ValidationErrorDetails;
  } catch {
    // Non-JSON error body — leave details undefined.
  }
  throw new ApiError(res.status, message, details);
}

/** Fetches all todos from GET /todos. Throws on a non-OK response. */
export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch(`${API_BASE}/todos`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch todos (HTTP ${res.status})`);
  }
  return (await res.json()) as Todo[];
}

/**
 * Creates a todo via POST /todos. The server validates with the shared Zod
 * schema; a 400 (empty title / invalid color) is surfaced as an `ApiError`
 * carrying the structured validation details.
 */
export async function createTodo(title: string, color?: PastelColor): Promise<Todo> {
  const res = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(color ? { title, color } : { title }),
  });

  if (!res.ok) {
    return throwApiError(res, `Failed to create todo (HTTP ${res.status})`);
  }

  return (await res.json()) as Todo;
}

/**
 * Updates an existing todo via PATCH /todos/:id and returns the persisted
 * todo. Accepts any subset of `{ title, done, color }`; the server validates
 * with the shared Zod schema. A 404 (unknown id) surfaces as an `ApiError`.
 */
export async function updateTodo(id: string, data: UpdateTodoInput): Promise<Todo> {
  const res = await fetch(`${API_BASE}/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    return throwApiError(res, `Failed to update todo (HTTP ${res.status})`);
  }

  return (await res.json()) as Todo;
}

/**
 * Deletes a todo via DELETE /todos/:id. Resolves once the server confirms the
 * deletion (204). A 404 (unknown id) surfaces as an `ApiError`.
 */
export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/todos/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    return throwApiError(res, `Failed to delete todo (HTTP ${res.status})`);
  }
}

/** Shape of the DELETE /todos?completed=true response. */
export interface ClearCompletedResult {
  deleted: number;
}

/**
 * Removes every completed todo via DELETE /todos?completed=true and returns
 * the number of todos that were removed.
 */
export async function clearCompleted(): Promise<ClearCompletedResult> {
  const res = await fetch(`${API_BASE}/todos?completed=true`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    return throwApiError(res, `Failed to clear completed todos (HTTP ${res.status})`);
  }

  return (await res.json()) as ClearCompletedResult;
}
