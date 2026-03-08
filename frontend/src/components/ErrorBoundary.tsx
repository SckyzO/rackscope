import { Component } from 'react';
import { Home, RefreshCw } from 'lucide-react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error) {
    console.error('[rackscope] UI error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center dark:bg-gray-950">
          <p className="text-brand-100 dark:text-brand-500/20 text-8xl font-black">500</p>
          <h1 className="-mt-4 text-2xl font-bold text-gray-900 dark:text-white">UI crashed</h1>
          <p className="mt-3 max-w-sm font-mono text-xs text-gray-400 dark:text-gray-600">
            {this.state.message}
          </p>
          <div className="mt-8 flex gap-3">
            <a
              href="/"
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </a>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
