'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials.');
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Enter password"
            required
            minLength={6}
          />
        </div>

        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        >
          {error && (
            <>
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </>
          )}
        </div>

        <button
          type="submit"
          className="mt-4 w-full flex justify-center items-center rounded-md bg-brand-red px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-brand-red disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Log in'
          )}
        </button>
      </form>

      {/* Added Signup Button */}
      <div className="mt-8 pt-6 border-t border-gray-100">
         <p className="text-center text-sm text-gray-600 mb-3">Don&apos;t have an account?</p>
         <Link
            href="/signup"
            className="flex justify-center w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-brand-red transition-colors"
         >
            Create an Account
         </Link>
      </div>
    </div>
  );
}
