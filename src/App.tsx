import { useRef, useState, type FormEvent } from 'react';
import { getBuildInfo, getEnvironment } from './environment';

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState('');
  const nextId = useRef(1);

  const environment = getEnvironment(window.location.hostname);
  const build = getBuildInfo();
  const remaining = todos.filter((todo) => !todo.completed).length;

  function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed === '') return;

    setTodos([...todos, { id: nextId.current, text: trimmed, completed: false }]);
    nextId.current += 1;
    setText('');
  }

  function toggleTodo(id: number) {
    setTodos(
      todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    );
  }

  function deleteTodo(id: number) {
    setTodos(todos.filter((todo) => todo.id !== id));
  }

  return (
    <main className="app">
      <p className={`env-badge env-${environment.toLowerCase()}`} data-testid="environment">
        {environment}
      </p>

      <h1>CI/CD Todo Demo</h1>

      <form onSubmit={addTodo} className="add-form">
        <label htmlFor="new-todo" className="visually-hidden">
          New todo
        </label>
        <input
          id="new-todo"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>

      <ul className="todo-list" aria-label="Todos">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.completed ? 'completed' : undefined}>
            <label>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span>{todo.text}</span>
            </label>
            <button
              type="button"
              onClick={() => deleteTodo(todo.id)}
              aria-label={`Delete ${todo.text}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <p data-testid="remaining">
        {remaining} {remaining === 1 ? 'todo' : 'todos'} remaining
      </p>

      <footer>
        Build <code data-testid="build-sha">{build.shortSha}</code> · run #{build.runNumber}
      </footer>
    </main>
  );
}
