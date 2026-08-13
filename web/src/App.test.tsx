import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App shell', () => {
  it('renders the Pastel Todo heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pastel Todo');
  });

  it('derives the palette from shared', () => {
    render(<App />);
    expect(screen.getByText(/6 pastel colors/)).toBeInTheDocument();
  });
});
