import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LoginForm from './LoginForm';

// Mock the server action
vi.mock('@/lib/actions', () => ({
  authenticate: vi.fn(),
}));

// Mock useActionState (part of React 19)
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: () => [null, vi.fn(), false], // [state, dispatch, isPending]
  };
});

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /log in/i })).toBeDefined();
  });
});
