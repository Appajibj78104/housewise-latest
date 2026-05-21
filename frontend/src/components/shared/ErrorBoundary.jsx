import React from 'react';

/**
 * Global error boundary — catches render errors anywhere in the tree
 * and shows a styled fallback UI instead of a white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-overlay">
          <div className="eb-card">
            {/* Illustration */}
            <div className="eb-illustration">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="56" stroke="#1E2230" strokeWidth="2" />
                <circle cx="60" cy="60" r="44" stroke="#FF6B4A" strokeWidth="1.5" opacity="0.3" />
                <path d="M60 28L60 68" stroke="#FF6B4A" strokeWidth="3" strokeLinecap="round" />
                <circle cx="60" cy="82" r="3" fill="#FF6B4A" />
                <path d="M30 90C30 90 42 78 60 78C78 78 90 90 90 90" stroke="#1E2230" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="eb-title">Something went wrong</h1>
            <p className="eb-message">
              An unexpected error occurred. Don't worry — your data is safe.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="eb-details">{this.state.error.message}</pre>
            )}

            <div className="eb-actions">
              <button className="eb-btn eb-btn-primary" onClick={this.handleRetry}>
                Try Again
              </button>
              <button className="eb-btn eb-btn-secondary" onClick={this.handleGoHome}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
