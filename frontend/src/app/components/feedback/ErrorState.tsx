import { AlertCircle } from 'lucide-react';

export const ErrorState = ({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <AlertCircle className="h-8 w-8 text-red-400" />
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-brand-500 hover:text-brand-600 text-xs font-medium hover:underline"
      >
        Try again
      </button>
    )}
  </div>
);
