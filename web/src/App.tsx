import { TodoList } from './TodoList';

export function App() {
  return (
    <main className="app">
      <h1>Pastel Todo</h1>
      <p className="tagline">Your shared, single-user pastel todo list.</p>
      <TodoList />
    </main>
  );
}
