import { useEffect, useState } from 'react';
import type { Todo } from '@pastel-todo/shared';
import { AddTodo } from './AddTodo';
import { fetchTodos, updateTodo } from './api';
import { DEFAULT_COLOR, PASTEL_CSS } from './pastel';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Renders the add-todo form and all todos as a pastel-colored list.
 * New todos are appended to the end of the list, matching the server's
 * creation-order (ascending createdAt) sort.
 */
export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    fetchTodos()
      .then((data) => {
        if (!active) return;
        setTodos(data);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  function handleCreated(todo: Todo) {
    setTodos((prev) => [...prev, todo]);
  }

  /**
   * Toggle a todo's done state. Applies the change optimistically so the UI
   * feels instant, then reconciles with the server response; reverts on error.
   */
  async function handleToggle(todo: Todo) {
    const nextDone = !todo.done;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, done: nextDone } : t)),
    );
    try {
      const updated = await updateTodo(todo.id, { done: nextDone });
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, done: updated.done } : t)),
      );
    } catch {
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, done: todo.done } : t)),
      );
    }
  }

  return (
    <>
      <AddTodo onCreated={handleCreated} />

      {state === 'loading' && <p className="todo-status">Loading your todos...</p>}

      {state === 'error' && (
        <p className="todo-status todo-status--error">
          Could not load your todos. Try again later.
        </p>
      )}

      {state === 'ready' && todos.length === 0 && (
        <p className="todo-empty">No todos yet. Add one above!</p>
      )}

      {state === 'ready' && todos.length > 0 && (
        <ul className="todo-list" aria-label="Your todos">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item${todo.done ? ' todo-item--done' : ''}`}
              style={{ backgroundColor: PASTEL_CSS[todo.color ?? DEFAULT_COLOR] }}
            >
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.done}
                onChange={() => handleToggle(todo)}
                aria-label={`Mark "${todo.title}" as ${todo.done ? 'not done' : 'done'}`}
              />
              <span className="todo-title">{todo.title}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
