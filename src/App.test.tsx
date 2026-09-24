import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

function setup() {
  const user = userEvent.setup();
  render(<App />);
  const input = screen.getByLabelText('New todo');
  const addButton = screen.getByRole('button', { name: 'Add' });

  async function addTodo(text: string) {
    await user.type(input, text);
    await user.click(addButton);
  }

  return { user, input, addTodo };
}

describe('Todo app', () => {
  it('renders the heading and starts with zero todos', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'CI/CD Todo Demo' })).toBeInTheDocument();
    expect(screen.getByTestId('remaining')).toHaveTextContent('0 todos remaining');
  });

  it('shows the Local environment badge and local build info when run locally', () => {
    setup();
    expect(screen.getByTestId('environment')).toHaveTextContent('Local');
    expect(screen.getByTestId('build-sha')).toHaveTextContent('local');
  });

  it('adds a todo and clears the input', async () => {
    const { input, addTodo } = setup();
    await addTodo('Learn CI/CD');

    const list = screen.getByRole('list', { name: 'Todos' });
    expect(within(list).getByText('Learn CI/CD')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getByTestId('remaining')).toHaveTextContent('1 todo remaining');
  });

  it('trims whitespace from new todos', async () => {
    const { addTodo } = setup();
    await addTodo('   Write tests   ');
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });

  it('ignores empty or whitespace-only todos', async () => {
    const { user, addTodo } = setup();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await addTodo('    ');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('marks a todo complete and incomplete again', async () => {
    const { user, addTodo } = setup();
    await addTodo('First');
    await addTodo('Second');
    expect(screen.getByTestId('remaining')).toHaveTextContent('2 todos remaining');

    const firstCheckbox = screen.getByRole('checkbox', { name: 'First' });
    await user.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();
    expect(screen.getByText('First').closest('li')).toHaveClass('completed');
    expect(screen.getByRole('checkbox', { name: 'Second' })).not.toBeChecked();
    expect(screen.getByTestId('remaining')).toHaveTextContent('1 todo remaining');

    await user.click(firstCheckbox);
    expect(firstCheckbox).not.toBeChecked();
    expect(screen.getByTestId('remaining')).toHaveTextContent('2 todos remaining');
  });

  it('deletes only the selected todo', async () => {
    const { user, addTodo } = setup();
    await addTodo('Keep me');
    await addTodo('Delete me');

    await user.click(screen.getByRole('button', { name: 'Delete Delete me' }));

    expect(screen.queryByText('Delete me')).not.toBeInTheDocument();
    expect(screen.getByText('Keep me')).toBeInTheDocument();
    expect(screen.getByTestId('remaining')).toHaveTextContent('1 todo remaining');
  });
});
