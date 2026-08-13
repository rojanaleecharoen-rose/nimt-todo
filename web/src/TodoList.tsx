import { useEffect, useState } from 'react';
import type { Todo } from '@pastel-todo/shared';
import { AddTodo } from './AddTodo';
import { TodoItem } from './TodoItem';
import { clearCompleted, deleteTodo, fetchTodos, updateTodo } from './api';

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

  /**
   * Persist an edited title and reconcile local state with the server response.
   * Rejects (throwing) when the server rejects the update, so the TodoItem can
   * surface the validation error inline.
   */
  async function handleRename(id: string, title: string) {
    const updated = await updateTodo(id, { title });
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: updated.title } : t)),
    );
  }

  /**
   * Delete a todo. Removes it from local state only after the server confirms,
   * so a failed delete leaves the list unchanged.
   */
  async function handleDelete(id: string) {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // Deletion failed — keep the todo so the user can retry.
    }
  }

  /**
   * Remove every completed todo. Drops all done items from local state only
   * after the server confirms, so a failed clear leaves the list unchanged.
   */
  async function handleClearCompleted() {
    try {
      await clearCompleted();
      setTodos((prev) => prev.filter((t) => !t.done));
    } catch {
      // Clear failed — keep the completed todos so the user can retry.
    }
  }

  const hasCompleted = todos.some((t) => t.done);

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
        <>
          <ul className="todo-list" aria-label="Your todos">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </ul>
          {hasCompleted && (
            <div className="todo-footer">
              <button
                type="button"
                className="todo-clear-completed"
                onClick={() => void handleClearCompleted()}
              >
                Clear completed
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
