import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ResolveHub ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('resolvehub_my_issues_v3');
      localStorage.removeItem('resolvehub_previous_issues_v3');
      localStorage.removeItem('resolvehub_discussions_data_v2');
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleLogout = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex align-items-center justify-content-center vh-100 bg-light p-4">
          <div
            className="card shadow-sm border-0 p-4 text-center bg-white"
            style={{ maxWidth: '520px', borderRadius: '12px' }}
          >
            <div className="mb-3 text-warning">
              <i className="bi bi-exclamation-triangle-fill fs-1"></i>
            </div>
            <h4 className="fw-bold text-navy mb-2">Something went wrong</h4>
            <p className="text-secondary small mb-3">
              An unexpected render issue occurred while loading this view. You can safely reload the page or clear cached local state.
            </p>
            {this.state.error?.message && (
              <div
                className="alert alert-danger py-2 px-3 small text-start mb-3 font-monospace"
                style={{ fontSize: '0.78rem', wordBreak: 'break-word' }}
              >
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm px-3 py-2 fw-semibold"
                onClick={this.handleReset}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Reload Page
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3 py-2"
                onClick={this.handleLogout}
              >
                <i className="bi bi-box-arrow-right me-1"></i> Clear Session &amp; Login
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
