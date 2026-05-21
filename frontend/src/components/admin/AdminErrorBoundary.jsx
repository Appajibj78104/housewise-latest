import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * AdminErrorBoundary - Per-section error boundary for admin pages.
 * Catches rendering errors in children and shows a recovery UI.
 */
class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[AdminErrorBoundary:${this.props.section || 'unknown'}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-6 border border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-content-primary">
                {this.props.title || 'Something went wrong'}
              </h4>
              <p className="text-xs text-content-muted mt-1">
                {this.props.fallbackMessage || 'This section encountered an error and could not render.'}
              </p>
              {this.state.error && (
                <pre className="mt-2 text-[10px] text-red-400 bg-surface-raised rounded p-2 overflow-x-auto max-h-20">
                  {this.state.error.message}
                </pre>
              )}
              <button
                onClick={this.handleRetry}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-blue-light bg-accent-blue-muted rounded-lg hover:bg-accent-blue-muted/80 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
