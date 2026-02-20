import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const CosmosComingSoon = () => {
  const location = useLocation();
  const page = location.pathname.split('/').pop() ?? 'page';
  const label = page.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex min-h-[480px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
          <Sparkles className="h-8 w-8 text-brand-500" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-gray-900 dark:text-white">{label}</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          This component page is being built. Come back soon.
        </p>
      </div>
    </div>
  );
};
