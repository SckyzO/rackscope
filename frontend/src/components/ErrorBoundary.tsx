import { Component } from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error) {
    // Surface the error in console to help debugging in dev.
    console.error('[rackscope] UI error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-bg-base)] text-[var(--color-text-base)]">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)]/80 px-6 py-4 text-center">
            <div className="text-status-crit mb-2 font-mono text-xs tracking-widest uppercase">
              UI Error
            </div>
            <div className="text-sm text-gray-400">{this.state.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
