import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          background: '#fdf6f0',
        }}>
          <h1 style={{ fontSize: '2rem', color: '#c0392b', marginBottom: '1rem' }}>
            কিছু একটা সমস্যা হয়েছে
          </h1>
          <p style={{ color: '#555', marginBottom: '1.5rem' }}>
            Something went wrong. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#e05c2a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{ marginTop: '1rem', textAlign: 'left', fontSize: '0.75rem', color: '#888', maxWidth: '600px', overflow: 'auto' }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
