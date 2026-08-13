import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

function mockFetch(data: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the Pastel Todo heading', async () => {
    mockFetch([]);
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pastel Todo');
    // Wait for the async fetch so the component settles without act warnings.
    await screen.findByText(/no todos yet/i);
  });

  it('shows the empty state when the API returns no todos', async () => {
    mockFetch([]);
    render(<App />);
    expect(await screen.findByText(/no todos yet/i)).toBeInTheDocument();
  });
});
