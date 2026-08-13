import { useEffect, useState } from 'react';
import type { Todo } from '@pastel-todo/shared';
import { fetchTodos } from './api';
import { DEFAULT_COLOR, PASTEL_CSS } from './pastel';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Fetches and renders all todos as a pastel-colored list.
 * Shows a friendly empty state when there are no todos.
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

  if (state === 'loading') {
    return <p className="todo-status">Loading your todos...</p>;
  }

  if (state === 'error') {
    return (
      <p className="todo-status todo-status--error">
        Could not load your todos. Try again later.
      </p>
    );
  }

  if (todos.length === 0) {
    return <p className="todo-empty">No todos yet. Add one above!</p>;
  }

  return (
    <ul className="todo-list" aria-label="Your todos">
      {todos.map((todo) => (
        <li
          key={todo.id}
          className="todo-item"
          style={{ backgroundColor: PASTEL_CSS[todo.color ?? DEFAULT_COLOR] }}
        >
          <span className="todo-title">{todo.title}</span>
        </li>
      ))}
    </ul>
  );
}
