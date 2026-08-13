import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('checks a todo off to mark it done and persists the toggle', async () => {
    const updated = makeTodo({ title: 'Buy milk', done: true });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? { ok: true, json: async () => updated }
          : { ok: true, json: async () => [makeTodo({ title: 'Buy milk' })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);

    const checkbox = (await screen.findByRole('checkbox', {
      name: /mark "buy milk" as done/i,
    })) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    // State reflects the server response: the checkbox is now checked.
    expect(
      await screen.findByRole('checkbox', { name: /mark "buy milk" as not done/i }),
    ).toBeInTheDocument();

    // The PATCH went to /todos/:id with { done: true }.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toMatch(/\/todos\/00000000-0000-0000-0000-000000000001$/);
    expect(init).toMatchObject({ method: 'PATCH' });
    expect(init).toBeDefined();
    expect(JSON.parse(String(init?.body))).toEqual({ done: true });
  });

  it('unchecks a done todo to reopen it', async () => {
    const updated = makeTodo({ title: 'Buy milk', done: false });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? { ok: true, json: async () => updated }
          : { ok: true, json: async () => [makeTodo({ title: 'Buy milk', done: true })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);

    const checkbox = (await screen.findByRole('checkbox', {
      name: /mark "buy milk" as not done/i,
    })) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    expect(
      await screen.findByRole('checkbox', { name: /mark "buy milk" as done/i }),
    ).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[1];
    expect(init).toBeDefined();
    expect(JSON.parse(String(init?.body))).toEqual({ done: false });
  });

  it('applies done styling (strike-through + dimmed) to completed todos', async () => {
    mockFetch([makeTodo({ title: 'Finished', done: true })]);

    render(<TodoList />);

    const item = (await screen.findByText('Finished')).closest('li');
    expect(item).not.toBeNull();
    expect(item).toHaveClass('todo-item--done');
  });

  it('does not dim incomplete todos', async () => {
    mockFetch([makeTodo({ title: 'Ongoing', done: false })]);

    render(<TodoList />);

    const item = (await screen.findByText('Ongoing')).closest('li');
    expect(item).not.toBeNull();
    expect(item).not.toHaveClass('todo-item--done');
  });
});

describe('TodoList inline title editing', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('enters edit mode on double-click with the current title pre-filled', async () => {
    mockFetch([makeTodo({ title: 'Buy milk' })]);
    render(<TodoList />);

    fireEvent.doubleClick(await screen.findByText('Buy milk'));

    const input = screen.getByLabelText(/edit todo title/i) as HTMLInputElement;
    expect(input).toHaveValue('Buy milk');
  });

  it('enters edit mode from the edit button', async () => {
    mockFetch([makeTodo({ title: 'Buy milk' })]);
    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.click(screen.getByRole('button', { name: /edit "buy milk"/i }));

    expect(screen.getByLabelText(/edit todo title/i)).toBeInTheDocument();
  });

  it('commits the edited title on Enter and shows the updated title', async () => {
    const updated = makeTodo({ title: 'Buy oat milk' });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? { ok: true, json: async () => updated }
          : { ok: true, json: async () => [makeTodo({ title: 'Buy milk' })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.doubleClick(screen.getByText('Buy milk'));
    const input = screen.getByLabelText(/edit todo title/i);
    fireEvent.change(input, { target: { value: 'Buy oat milk' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText('Buy oat milk')).toBeInTheDocument();
    expect(screen.queryByLabelText(/edit todo title/i)).not.toBeInTheDocument();

    // The PATCH went to /todos/:id with { title }.
    const [, init] = fetchMock.mock.calls[1];
    expect(init).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(String(init?.body))).toEqual({ title: 'Buy oat milk' });
  });

  it('cancels editing on Escape and reverts to the original title', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? { ok: true, json: async () => makeTodo({ title: 'Buy milk' }) }
          : { ok: true, json: async () => [makeTodo({ title: 'Buy milk' })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.doubleClick(screen.getByText('Buy milk'));
    const input = screen.getByLabelText(/edit todo title/i);
    fireEvent.change(input, { target: { value: 'Changed my mind' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.queryByLabelText(/edit todo title/i)).not.toBeInTheDocument();
    // Only the initial GET happened — no PATCH on cancel.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows an inline validation error when the edited title is empty', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? { ok: true, json: async () => makeTodo() }
          : { ok: true, json: async () => [makeTodo({ title: 'Buy milk' })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.doubleClick(screen.getByText('Buy milk'));
    const input = screen.getByLabelText(/edit todo title/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/must not be empty/i);
    // Still editing so the user can correct the title.
    expect(screen.getByLabelText(/edit todo title/i)).toBeInTheDocument();
    // No PATCH was attempted for an invalid title.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error when the server rejects the title update', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              formErrors: [],
              fieldErrors: { title: ['title must not be empty'] },
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => [makeTodo({ title: 'Buy milk' })] });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.doubleClick(screen.getByText('Buy milk'));
    const input = screen.getByLabelText(/edit todo title/i);
    fireEvent.change(input, { target: { value: 'blocked by server' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/must not be empty/i);
    expect(screen.getByLabelText(/edit todo title/i)).toBeInTheDocument();
  });

  it('shows the updated title after a page refresh re-fetches from the API', async () => {
    let edited = false;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        edited = true;
        return Promise.resolve({ ok: true, json: async () => makeTodo({ title: 'Buy oat milk' }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => (edited ? [makeTodo({ title: 'Buy oat milk' })] : [makeTodo({ title: 'Buy milk' })]),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.doubleClick(screen.getByText('Buy milk'));
    const input = screen.getByLabelText(/edit todo title/i);
    fireEvent.change(input, { target: { value: 'Buy oat milk' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(await screen.findByText('Buy oat milk')).toBeInTheDocument();

    // Simulate a page refresh: unmount and remount, which re-fetches from the API.
    first.unmount();
    render(<TodoList />);
    expect(await screen.findByText('Buy oat milk')).toBeInTheDocument();
  });
});

describe('TodoList delete + clear completed', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('deletes a todo when its delete control is clicked, without a full reload', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'DELETE'
          ? { ok: true, json: async () => ({}) }
          : {
              ok: true,
              json: async () => [
                makeTodo({ title: 'Buy milk' }),
                makeTodo({
                  id: '00000000-0000-0000-0000-000000000002',
                  title: 'Walk dog',
                }),
              ],
            },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);

    await screen.findByText('Buy milk');
    fireEvent.click(screen.getByRole('button', { name: /delete "buy milk"/i }));

    // The deleted todo is gone, the sibling remains — and no reload occurred.
    await waitFor(() =>
      expect(screen.queryByText('Buy milk')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Walk dog')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The DELETE went to /todos/:id.
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toMatch(/\/todos\/00000000-0000-0000-0000-000000000001$/);
    expect(init).toMatchObject({ method: 'DELETE' });
  });

  it('keeps a todo in the list when the delete request fails', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'DELETE'
          ? { ok: false, status: 500, json: async () => ({}) }
          : { ok: true, json: async () => [makeTodo({ title: 'Buy milk' })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);

    await screen.findByText('Buy milk');
    fireEvent.click(screen.getByRole('button', { name: /delete "buy milk"/i }));

    expect(await screen.findByText('Buy milk')).toBeInTheDocument();
  });

  it('clears all completed todos and keeps incomplete ones', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'DELETE'
          ? { ok: true, json: async () => ({ deleted: 1 }) }
          : {
              ok: true,
              json: async () => [
                makeTodo({ title: 'Done', done: true }),
                makeTodo({ title: 'Pending' }),
              ],
            },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);

    await screen.findByText('Done');
    fireEvent.click(screen.getByRole('button', { name: /clear completed/i }));

    // Done items are gone, incomplete items remain — no reload occurred.
    await waitFor(() =>
      expect(screen.queryByText('Done')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The DELETE went to /todos?completed=true.
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain('/todos?completed=true');
    expect(init).toMatchObject({ method: 'DELETE' });
  });

  it('hides the clear-completed control when no todos are done', async () => {
    mockFetch([makeTodo({ title: 'Active only' })]);

    render(<TodoList />);

    await screen.findByText('Active only');
    expect(screen.queryByRole('button', { name: /clear completed/i })).not.toBeInTheDocument();
  });
});

describe('TodoList filtering + active count', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const mixedTodos = () => [
    makeTodo({ title: 'Buy milk' }),
    makeTodo({ title: 'Walk dog', done: true }),
  ];

  it('renders All / Active / Completed filter controls and the active count', async () => {
    mockFetch(mixedTodos());

    render(<TodoList />);
    await screen.findByText('Buy milk');

    const all = screen.getByRole('button', { name: /^all$/i });
    const active = screen.getByRole('button', { name: /^active$/i });
    const completed = screen.getByRole('button', { name: /^completed$/i });

    expect(all).toBeInTheDocument();
    expect(active).toBeInTheDocument();
    expect(completed).toBeInTheDocument();

    // "All" is selected by default.
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(active).toHaveAttribute('aria-pressed', 'false');
    expect(completed).toHaveAttribute('aria-pressed', 'false');

    // One of the two todos is incomplete.
    expect(screen.getByText('1 item left')).toBeInTheDocument();
  });

  it('shows only incomplete todos when the Active filter is selected', async () => {
    mockFetch(mixedTodos());

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.click(screen.getByRole('button', { name: /^active$/i }));

    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.queryByText('Walk dog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^active$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows only completed todos when the Completed filter is selected', async () => {
    mockFetch(mixedTodos());

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.click(screen.getByRole('button', { name: /^completed$/i }));

    expect(screen.getByText('Walk dog')).toBeInTheDocument();
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  it('shows all todos when the All filter is selected', async () => {
    mockFetch(mixedTodos());

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.click(screen.getByRole('button', { name: /^active$/i }));
    expect(screen.queryByText('Walk dog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));

    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Walk dog')).toBeInTheDocument();
  });

  it('counts the incomplete todos across a mixed list', async () => {
    mockFetch([
      makeTodo({ title: 'One' }),
      makeTodo({ title: 'Two' }),
      makeTodo({ title: 'Three', done: true }),
    ]);

    render(<TodoList />);
    await screen.findByText('One');

    expect(screen.getByText('2 items left')).toBeInTheDocument();
  });

  it('updates the active count when a todo is toggled done', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? { ok: true, json: async () => makeTodo({ title: 'Buy milk', done: true }) }
          : { ok: true, json: async () => [makeTodo({ title: 'Buy milk' })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Buy milk');
    expect(screen.getByText('1 item left')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /mark "buy milk" as done/i }));

    expect(await screen.findByText('0 items left')).toBeInTheDocument();
  });

  it('updates the active count when a done todo is reopened', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? { ok: true, json: async () => makeTodo({ title: 'Buy milk', done: false }) }
          : { ok: true, json: async () => [makeTodo({ title: 'Buy milk', done: true })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Buy milk');
    expect(screen.getByText('0 items left')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /mark "buy milk" as not done/i }));

    expect(await screen.findByText('1 item left')).toBeInTheDocument();
  });

  it('updates the active count when a new incomplete todo is added', async () => {
    const created = makeTodo({
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Fresh task',
    });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? { ok: true, json: async () => created }
          : { ok: true, json: async () => [makeTodo({ title: 'Existing' })] },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Existing');
    expect(screen.getByText('1 item left')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/new todo title/i), {
      target: { value: 'Fresh task' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByText('Fresh task')).toBeInTheDocument();
    expect(screen.getByText('2 items left')).toBeInTheDocument();
  });

  it('updates the active count when a todo is deleted', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'DELETE'
          ? { ok: true, json: async () => ({}) }
          : {
              ok: true,
              json: async () => [
                makeTodo({ title: 'Buy milk' }),
                makeTodo({ id: '00000000-0000-0000-0000-000000000002', title: 'Walk dog' }),
              ],
            },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Buy milk');
    expect(screen.getByText('2 items left')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete "buy milk"/i }));

    await waitFor(() =>
      expect(screen.queryByText('Buy milk')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('1 item left')).toBeInTheDocument();
  });

  it('does not delete the underlying todos when filtering', async () => {
    mockFetch(mixedTodos());

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.click(screen.getByRole('button', { name: /^active$/i }));
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.queryByText('Walk dog')).not.toBeInTheDocument();

    // Switch back to All — the filtered-out todo was never removed.
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Walk dog')).toBeInTheDocument();
  });

  it('drops a todo from the Active view when toggled done but keeps it in All', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? { ok: true, json: async () => makeTodo({ title: 'Buy milk', done: true }) }
          : {
              ok: true,
              json: async () => [
                makeTodo({ title: 'Buy milk' }),
                makeTodo({ title: 'Walk dog', done: true }),
              ],
            },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<TodoList />);
    await screen.findByText('Buy milk');

    fireEvent.click(screen.getByRole('button', { name: /^active$/i }));
    expect(screen.queryByText('Walk dog')).not.toBeInTheDocument();
    expect(screen.getByText('1 item left')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /mark "buy milk" as done/i }));

    // Done while on the Active filter → it leaves the filtered view.
    await waitFor(() =>
      expect(screen.queryByText('Buy milk')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('0 items left')).toBeInTheDocument();

    // It still exists in the underlying list — back on All it's present (done).
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Walk dog')).toBeInTheDocument();
  });
});
