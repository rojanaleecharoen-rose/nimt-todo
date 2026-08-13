import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  createTodoSchema,
  PASTEL_COLORS,
  type PastelColor,
  type Todo,
} from '@pastel-todo/shared';
import { ApiError, createTodo } from './api';

interface AddTodoProps {
  /** Called with the persisted todo after a successful create. */
  onCreated: (todo: Todo) => void;
}

/** Sentinel value meaning "no color chosen" (the server applies the default). */
const NO_COLOR = '';

/**
 * Validates a proposed create payload against the shared Zod schema and
 * returns the first inline error message, or null when the input is valid.
 */
function validationMessageFor(input: { title: string; color?: PastelColor }): string | null {
  const parsed = createTodoSchema.safeParse(input);
  if (parsed.success) return null;
  const fields = parsed.error.flatten().fieldErrors;
  return fields.title?.[0] ?? fields.color?.[0] ?? 'Please enter a valid todo.';
}

/** Pulls the most specific message out of a server validation error body. */
function serverErrorMessage(apiError: ApiError): string {
  const { fieldErrors, formErrors } = apiError.details?.error ?? {};
  return (
    fieldErrors?.title?.[0] ??
    fieldErrors?.color?.[0] ??
    formErrors?.[0] ??
    'Could not create the todo. Please try again.'
  );
}

/**
 * Add-todo form: title input, pastel color picker, and an Add button.
 * Submits on Enter in the title input or on Add-button click. Validates the
 * title with the shared Zod schema and shows the resulting error inline.
 */
export function AddTodo({ onCreated }: AddTodoProps) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<PastelColor | typeof NO_COLOR>(NO_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /** Submit the form on Enter, mirroring a native single-field form. */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !submitting) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validate with the shared schema so the inline error matches the server's.
    const trimmedTitle = title.trim();
    const message = validationMessageFor({ title: trimmedTitle, color: color || undefined });
    if (message) {
      setError(message);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const todo = await createTodo(trimmedTitle, color || undefined);
      onCreated(todo);
      setTitle('');
      setColor(NO_COLOR);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? serverErrorMessage(err)
          : 'Could not create the todo. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="add-form" onSubmit={handleSubmit} noValidate>
      <div className="add-form__row">
        <input
          type="text"
          className="add-form__input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          aria-label="New todo title"
          aria-invalid={error ? true : undefined}
        />
        <select
          className="add-form__color"
          value={color}
          onChange={(event) => setColor(event.target.value as PastelColor | typeof NO_COLOR)}
          aria-label="Color"
        >
          <option value={NO_COLOR}>Default</option>
          {PASTEL_COLORS.map((pastel) => (
            <option key={pastel} value={pastel}>
              {pastel}
            </option>
          ))}
        </select>
        <button type="submit" className="add-form__submit" disabled={submitting}>
          Add
        </button>
      </div>
      {error && (
        <p className="add-form__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
