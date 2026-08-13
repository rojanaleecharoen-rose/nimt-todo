import { useState, type KeyboardEvent } from 'react';
import type { Todo } from '@pastel-todo/shared';
import { updateTodoSchema } from '@pastel-todo/shared';
import { ApiError } from './api';
import { DEFAULT_COLOR, PASTEL_CSS } from './pastel';

interface TodoItemProps {
  /** The todo to render. The parent owns the authoritative list state. */
  todo: Todo;
  /** Toggle the todo's done state (owned by the parent's optimistic toggle). */
  onToggle: (todo: Todo) => void;
  /** Persist a title edit; rejects (throws) when the server rejects it. */
  onRename: (id: string, title: string) => Promise<void>;
  /** Delete the todo by id (owned by the parent's delete handler). */
  onDelete: (id: string) => void;
}

/** Pulls the most specific message out of a server validation error body. */
function serverErrorMessage(apiError: ApiError): string {
  const { fieldErrors, formErrors } = apiError.details?.error ?? {};
  return (
    fieldErrors?.title?.[0] ??
    formErrors?.[0] ??
    'Could not save the title. Please try again.'
  );
}

/**
 * Validates a proposed title against the shared Zod schema so the inline error
 * matches what the server would return for the same payload.
 */
function titleValidationMessage(title: string): string | null {
  const parsed = updateTodoSchema.safeParse({ title });
  if (parsed.success) return null;
  return (
    parsed.error.flatten().fieldErrors.title?.[0] ?? 'Please enter a title.'
  );
}

/**
 * A single pastel todo row: checkbox + title. The title is editable inline —
 * double-click the title (or use the edit button) to swap it for a text input
 * that commits on Enter/Save and cancels on Escape/Cancel. Empty or server-
 * rejected titles surface as an inline error without leaving edit mode.
 */
export function TodoItem({ todo, onToggle, onRename, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDraft(todo.title);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  /** Commit the current draft. Trims, validates, then persists via the parent. */
  async function commit() {
    const trimmed = draft.trim();
    const message = titleValidationMessage(trimmed);
    if (message) {
      setError(message);
      return;
    }
    if (trimmed === todo.title) {
      // Nothing changed — just close the editor.
      setEditing(false);
      setError(null);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onRename(todo.id, trimmed);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? serverErrorMessage(err)
          : 'Could not save the title. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  }

  return (
    <li
      className={`todo-item${todo.done ? ' todo-item--done' : ''}${
        editing ? ' todo-item--editing' : ''
      }`}
      style={{ backgroundColor: PASTEL_CSS[todo.color ?? DEFAULT_COLOR] }}
    >
      <input
        type="checkbox"
        className="todo-checkbox"
        checked={todo.done}
        onChange={() => onToggle(todo)}
        aria-label={`Mark "${todo.title}" as ${todo.done ? 'not done' : 'done'}`}
        disabled={editing}
      />
      {editing ? (
        <div className="todo-edit">
          <div className="todo-edit__row">
            <input
              type="text"
              className="todo-edit__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              aria-label="Edit todo title"
              aria-invalid={error ? true : undefined}
              disabled={saving}
            />
            <button
              type="button"
              className="todo-edit__save"
              onClick={() => void commit()}
              disabled={saving}
            >
              Save
            </button>
            <button
              type="button"
              className="todo-edit__cancel"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="todo-edit__error" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          <span
            className="todo-title"
            onDoubleClick={startEditing}
            title="Double-click to edit"
          >
            {todo.title}
          </span>
          <button
            type="button"
            className="todo-edit__trigger"
            onClick={startEditing}
            aria-label={`Edit "${todo.title}"`}
          >
            ✎
          </button>
          <button
            type="button"
            className="todo-delete"
            onClick={() => onDelete(todo.id)}
            aria-label={`Delete "${todo.title}"`}
          >
            🗑
          </button>
        </>
      )}
    </li>
  );
}
