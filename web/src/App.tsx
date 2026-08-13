import { PASTEL_COLORS } from '@pastel-todo/shared';

export function App() {
  return (
    <main className="app">
      <h1>Pastel Todo</h1>
      <p>Your shared, single-user pastel todo list.</p>
      <p className="palette">
        {PASTEL_COLORS.length} pastel colors: {PASTEL_COLORS.join(', ')}
      </p>
    </main>
  );
}
