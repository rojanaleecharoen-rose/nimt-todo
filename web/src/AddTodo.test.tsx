import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Todo } from '@pastel-todo/shared';
import { AddTodo } from './AddTodo';

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Sample',
  done: false,
  color: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

function mockCreate(resBody: Todo) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => resBody });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('AddTodo', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('creates a todo when the Add button is clicked', async () => {
    const created = makeTodo({ title: 'Buy milk' });
    const fetchMock = mockCreate(created);
    const onCreated = vi.fn();

    render(<AddTodo onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/new todo title/i), {
      target: { value: 'Buy milk' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/todos$/);
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(init.body))).toEqual({ title: 'Buy milk' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('creates a todo when Enter is pressed in the title input', async () => {
    const created = makeTodo({ title: 'Walk dog' });
    const fetchMock = mockCreate(created);
    const onCreated = vi.fn();

    render(<AddTodo onCreated={onCreated} />);

    const input = screen.getByLabelText(/new todo title/i);
    fireEvent.change(input, { target: { value: 'Walk dog' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows an inline validation error when the title is empty', async () => {
    const onCreated = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<AddTodo onCreated={onCreated} />);

    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/must not be empty/i);
    expect(onCreated).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows an inline validation error for whitespace-only titles', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<AddTodo onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/new todo title/i), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/must not be empty/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the selected color and reports the created todo', async () => {
    const created = makeTodo({ title: 'Sky note', color: 'sky' });
    const fetchMock = mockCreate(created);
    const onCreated = vi.fn();

    render(<AddTodo onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/new todo title/i), {
      target: { value: 'Sky note' },
    });
    fireEvent.change(screen.getByLabelText(/color/i), { target: { value: 'sky' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init.body))).toEqual({ title: 'Sky note', color: 'sky' });
  });

  it('omits the color when none is chosen (server applies the default)', async () => {
    const created = makeTodo({ title: 'Plain', color: null });
    const fetchMock = mockCreate(created);
    const onCreated = vi.fn();

    render(<AddTodo onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/new todo title/i), {
      target: { value: 'Plain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init.body))).toEqual({ title: 'Plain' });
  });

  it('shows a validation error returned by the server on a 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { formErrors: [], fieldErrors: { title: ['title must not be empty'] } },
        }),
      }),
    );
    const onCreated = vi.fn();

    render(<AddTodo onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/new todo title/i), {
      target: { value: 'blocked by server' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/must not be empty/i);
    expect(onCreated).not.toHaveBeenCalled();
  });
});
