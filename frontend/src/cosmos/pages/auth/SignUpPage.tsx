import { Activity } from 'lucide-react';

export const SignUpPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Get started with Cosmos today</p>
        </div>
        <form className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">First name</label>
              <input type="text" placeholder="John" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Last name</label>
              <input type="text" placeholder="Doe" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input type="email" placeholder="you@example.com" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input type="password" placeholder="Create a password" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <p className="mt-1 text-xs text-gray-400">Must be at least 8 characters.</p>
          </div>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-brand-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">I agree to the <a href="#" className="text-brand-500 hover:text-brand-600">Terms of Service</a> and <a href="#" className="text-brand-500 hover:text-brand-600">Privacy Policy</a></span>
          </label>
          <button type="submit" className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Create Account</button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account? <a href="/cosmos/auth/signin" className="font-medium text-brand-500 hover:text-brand-600">Sign in</a>
        </p>
      </div>
    </div>
  </div>
);
