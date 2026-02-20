import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => (
  <div className="flex min-h-[500px] flex-col items-center justify-center px-6 text-center">
    <p className="text-brand-100 dark:text-brand-500/20 text-8xl font-black">404</p>
    <h1 className="-mt-4 text-2xl font-bold text-gray-900 dark:text-white">Page not found</h1>
    <p className="mt-3 max-w-sm text-sm text-gray-500 dark:text-gray-400">
      Sorry, the page you're looking for doesn't exist or has been moved.
    </p>
    <div className="mt-8 flex gap-3">
      <a
        href="/cosmos"
        className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
      >
        <Home className="h-4 w-4" /> Go to Dashboard
      </a>
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
      >
        <ArrowLeft className="h-4 w-4" /> Go Back
      </button>
    </div>
  </div>
);
