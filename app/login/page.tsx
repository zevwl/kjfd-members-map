import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center md:h-screen bg-gray-50">
      <div className="relative mx-auto flex w-full max-w-100 flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-brand-red p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <h1 className="text-2xl font-bold">FD Map</h1>
            <p className="text-sm opacity-90">Member Response System</p>
          </div>
        </div>
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8 shadow-sm ring-1 ring-gray-900/5 sm:bg-white">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            Please log in to continue.
          </h2>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
