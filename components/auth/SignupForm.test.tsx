import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SignupForm from './SignupForm';

// Mock the server action
vi.mock('@/lib/actions', () => ({
  signup: vi.fn(),
}));

// Mock useActionState (part of React 19)
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: () => [null, vi.fn(), false],
  };
});

describe('SignupForm', () => {
  it('renders all required inputs', () => {
    render(<SignupForm />);

    expect(screen.getByLabelText(/email/i)).toBeDefined();
    // Use getAllByLabelText because there are two password fields (Password and Confirm Password)
    // or select by specific name attribute if using querying by selectors,
    // but label text is distinct in our component ("Password" vs "Confirm Password")
    expect(screen.getByLabelText(/^Password$/i)).toBeDefined();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeDefined();
  });

  it('contains a link to login page', () => {
    render(<SignupForm />);
    const loginLink = screen.getByRole('link', { name: /log in/i });
    expect(loginLink).toBeDefined();
    expect(loginLink.getAttribute('href')).toBe('/login');
  });
});
