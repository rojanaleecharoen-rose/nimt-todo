import type { Todo } from '@pastel-todo/shared';

/**
 * Base URL for the API. When empty (the default in dev), requests go through
 * the Vite proxy configured in vite.config.ts. Set VITE_API_URL to point the
 * app at a different backend (e.g. http://localhost:3000) without a proxy.
 */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

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
