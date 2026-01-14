'use client';

import { useActionState } from 'react';
import { signup } from '@/lib/actions';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupForm() {
  const [errorMessage, dispatch, isPending] = useActionState(signup, undefined);

  return (
    <form action={dispatch} className="space-y-4">
      <div>
        <label
          className="mb-2 block text-sm font-medium text-gray-900"
          htmlFor="email"
        >
          Email
        </label>
        <input
          className="peer block w-full rounded-md border border-gray-200 py-2.25 px-3 text-sm outline-2 placeholder:text-gray-500 focus:border-brand-red focus:ring-brand-red"
          id="email"
          type="email"
          name="email"
          placeholder="Enter your email address"
          required
        />
      </div>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-gray-900"
          htmlFor="password"
        >
          Password
        </label>
        <input
          className="peer block w-full rounded-md border border-gray-200 py-2.25 px-3 text-sm outline-2 placeholder:text-gray-500 focus:border-brand-red focus:ring-brand-red"
          id="password"
          type="password"
          name="password"
          placeholder="Create a password"
          required
          minLength={6}
        />
      </div>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-gray-900"
          htmlFor="confirmPassword"
        >
          Confirm Password
        </label>
        <input
          className="peer block w-full rounded-md border border-gray-200 py-2.25 px-3 text-sm outline-2 placeholder:text-gray-500 focus:border-brand-red focus:ring-brand-red"
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          placeholder="Confirm password"
          required
          minLength={6}
        />
      </div>

      <div
        className="flex h-8 items-end space-x-1"
        aria-live="polite"
        aria-atomic="true"
      >
        {errorMessage && (
          <>
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-500">{errorMessage}</p>
          </>
        )}
      </div>

      <button
        className="mt-4 w-full flex justify-center items-center rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline  focus-visible:outline-offset-2 focus-visible:outline-brand-red disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          'Sign Up'
        )}
      </button>

      <div className="mt-4 text-center text-sm">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-red hover:text-red-700">
            Log in
          </Link>
        </p>
      </div>
    </form>
  );
}
