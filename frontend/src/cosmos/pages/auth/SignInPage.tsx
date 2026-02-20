import { Activity } from 'lucide-react';

export const SignInPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
    <div className="w-full max-w-md">
      <div className="shadow-theme-sm rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="bg-brand-500 flex h-12 w-12 items-center justify-center rounded-xl text-white">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cosmos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
        </div>

        {/* Social */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {['Google', 'Twitter'].map((provider) => (
            <button
              key={provider}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <span className="h-4 w-4 rounded-full bg-gray-400" />
              Continue with {provider}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center gap-3">
          <hr className="flex-1 border-gray-200 dark:border-gray-800" />
          <span className="text-xs text-gray-400">or continue with email</span>
          <hr className="flex-1 border-gray-200 dark:border-gray-800" />
        </div>

        {/* Form */}
        <form className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="focus:border-brand-500 w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <a href="#" className="text-brand-500 hover:text-brand-600 text-xs">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              className="focus:border-brand-500 w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-brand-500 h-4 w-4 rounded" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
          </label>
          <button
            type="submit"
            className="bg-brand-500 hover:bg-brand-600 w-full rounded-lg py-2.5 text-sm font-semibold text-white"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <a href="/cosmos/auth/signup" className="text-brand-500 hover:text-brand-600 font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  </div>
);
