"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 * and displays a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error("🚨 ErrorBoundary caught an error:", error, errorInfo);
    
    // Optional: Send to error tracking service (e.g., Sentry)
    // if (process.env.NODE_ENV === 'production') {
    //   reportError(error, errorInfo);
    // }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            padding: "2rem",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            textAlign: "center",
            maxWidth: "500px",
            margin: "2rem auto",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
            }}
          >
            <AlertTriangle size={40} color="var(--status-escalated-text)" />
          </div>

          <h2
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.5rem",
              color: "var(--text-heading)",
            }}
          >
            Oops! Something went wrong
          </h2>

          <p
            style={{
              margin: "0 0 1.5rem 0",
              color: "var(--text-muted)",
              fontSize: "0.95rem",
            }}
          >
            We&apos;re sorry for the inconvenience. Please try refreshing the page.
          </p>

          {error && (
            <details
              style={{
                width: "100%",
                marginBottom: "1.5rem",
                textAlign: "left",
                backgroundColor: "var(--bg-color)",
                borderRadius: "8px",
                padding: "1rem",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: "0.5rem" }}>
                Error Details
              </summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  margin: 0,
                }}
              >
                {error.toString()}
              </pre>
            </details>
          )}

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={this.handleRetry}
              className="btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={18} />
              Retry
            </button>

            <button
              onClick={() => window.history.back()}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
                fontWeight: 600,
                cursor: "pointer",
                background: "var(--bg-color)",
                border: "1px solid var(--border-color)",
                color: "var(--text-heading)",
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
