import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    // Added wrapper to handle scrolling locally within the fixed layout
    <div className="h-full w-full overflow-y-auto bg-gray-50">
      <main className="flex min-h-full flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full max-w-100 space-y-4">
          <div className="rounded-lg bg-gray-50 px-6 pb-4 pt-8 shadow-sm ring-1 ring-gray-900/5 sm:bg-white">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              Please log in to continue.
            </h2>
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
