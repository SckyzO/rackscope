import { Spinner } from '../ui/Spinner';

export const LoadingState = ({ message = 'Loading…' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <Spinner size="lg" />
    <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
  </div>
);
