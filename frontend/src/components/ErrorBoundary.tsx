import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-ink text-[#f5f5f5] flex items-center justify-center p-6">
        <div className="card p-6 max-w-xl w-full">
          <h1 className="text-xl font-bold mb-3">Something went wrong</h1>
          <p className="text-sm text-muted mb-4">The page could not be displayed. Reload the page, or continue with another section of the site.</p>
          <pre className="p-3 rounded-lg bg-surface/60 text-xs text-red-400 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
          <div className="flex flex-wrap gap-3 mt-5">
            <button onClick={() => window.location.reload()} className="btn btn-primary !text-xs">Reload page</button>
            <a href="/" className="btn btn-outline !text-xs">Go home</a>
          </div>
        </div>
      </div>
    );
  }
}
