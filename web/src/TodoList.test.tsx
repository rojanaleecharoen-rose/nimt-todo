import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Todo } from '@pastel-todo/shared';
import { PASTEL_CSS } from './pastel';
import { TodoList } from './TodoList';

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Sample',
  done: false,
  color: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

function mockFetch(data: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
  );
}

describe('TodoList', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('fetches and renders todos in a list', async () => {
    mockFetch([makeTodo({ title: 'Buy milk' }), makeTodo({ title: 'Walk dog' })]);

    render(<TodoList />);

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Walk dog')).toBeInTheDocument();
  });

  it('shows the empty state when the API returns an empty list', async () => {
    mockFetch([]);

    render(<TodoList />);

    expect(await screen.findByText(/no todos yet/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('uses the default pastel for a todo with no color', async () => {
    mockFetch([makeTodo({ title: 'Plain', color: null })]);

    render(<TodoList />);

    const item = (await screen.findByText('Plain')).closest('li');
    expect(item).not.toBeNull();
    expect(item).toHaveStyle({ backgroundColor: PASTEL_CSS.mint });
  });

  it('uses the specified pastel for a colored todo', async () => {
    mockFetch([makeTodo({ title: 'Sky note', color: 'sky' })]);

    render(<TodoList />);

    const item = (await screen.findByText('Sky note')).closest('li');
    expect(item).not.toBeNull();
    expect(item).toHaveStyle({ backgroundColor: PASTEL_CSS.sky });
  });

  it('shows a newly created todo in the list after submission', async () => {
    const created = makeTodo({
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Fresh task',
      color: 'peach',
    });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? { ok: true, json: async () => created }
          : { ok: true, json: async () => [] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);

    // Initial GET loads the empty state.
    expect(await screen.findByText(/no todos yet/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/new todo title/i), {
      target: { value: 'Fresh task' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByText('Fresh task')).toBeInTheDocument();
    expect(screen.queryByText(/no todos yet/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
