import React from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { cn } from "@/lib/utils";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 Error Boundary caught an error:", error);
    console.error("🚨 Error Info:", errorInfo);

    this.setState({
      error,
      errorInfo,
      hasError: true,
    });

    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      const { fallback: CustomFallback, showDetails = false } = this.props;

      if (CustomFallback) {
        return (
          <CustomFallback
            error={error}
            errorInfo={errorInfo}
            retry={this.handleRetry}
            reload={this.handleReload}
            goHome={this.handleGoHome}
          />
        );
      }

      return (
        <div className="min-h-100 flex items-center h-screen justify-center p-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
          <div className="max-w-lg w-full space-y-6 animate-fade-in">
            {/* Error Alert */}
            <Alert
              variant="destructive"
              className={cn(
                "border-l-4 border-red-500 dark:border-red-600 shadow-lg transition-all duration-300",
                "bg-neutral-50 dark:bg-red-900/20 dark:border-red-800",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm",
                    "bg-red-100 dark:bg-red-900/30",
                  )}
                >
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>

                <AlertDescription className="flex-1">
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-lg text-red-900 dark:text-red-400">
                        Something went wrong
                      </div>
                      <div className="text-sm mt-1 text-red-700 dark:text-red-300">
                        {error?.message ||
                          "An unexpected error occurred while loading this component."}
                      </div>
                    </div>

                    {retryCount > 0 && (
                      <div
                        className={cn(
                          "text-xs p-2 rounded border inline-block transition-colors duration-200",
                          "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800",
                          "text-red-700 dark:text-red-300",
                        )}
                      >
                        Retry attempts: {retryCount}
                      </div>
                    )}

                    {/* Error Details (Development) */}
                    {(showDetails || process.env.NODE_ENV === "development") &&
                      error && (
                        <details className="text-xs group">
                          <summary
                            className={cn(
                              "cursor-pointer font-medium flex items-center space-x-1 transition-all duration-200",
                              "text-red-700 dark:text-red-400",
                              "hover:text-red-800 dark:hover:text-red-300",
                            )}
                          >
                            <Bug className="w-3 h-3" />
                            <span>Technical Details</span>
                          </summary>
                          <div
                            className={cn(
                              "mt-2 p-3 rounded border overflow-auto max-h-64 transition-colors duration-200",
                              "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                            )}
                          >
                            <div className="font-medium text-red-900 dark:text-red-400">
                              Error:
                            </div>
                            <pre className="whitespace-pre-wrap text-xs mt-1 font-mono text-red-700 dark:text-red-300">
                              {error.toString()}
                            </pre>

                            {errorInfo?.componentStack && (
                              <>
                                <div className="font-medium mt-3 text-red-900 dark:text-red-400">
                                  Component Stack:
                                </div>
                                <pre className="whitespace-pre-wrap text-xs mt-1 font-mono text-red-700 dark:text-red-300">
                                  {errorInfo.componentStack}
                                </pre>
                              </>
                            )}
                          </div>
                        </details>
                      )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleRetry}
                disabled={retryCount >= 3}
                className={cn(
                  "flex-1 transition-all duration-200 shadow-sm hover:shadow-md",
                  "bg-red-600 hover:bg-red-700 text-white",
                  "dark:bg-red-700 dark:hover:bg-red-800",
                  retryCount >= 3 && "opacity-50 cursor-not-allowed",
                )}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {retryCount >= 3 ? "Max Retries Reached" : "Try Again"}
              </Button>

              <Button
                variant="outline"
                onClick={this.handleReload}
                className={cn(
                  "flex-1 transition-all duration-200 shadow-sm hover:shadow-md",
                  "hover:bg-gray-100 dark:hover:bg-slate-800",
                  "dark:text-gray-200 dark:border-slate-600",
                )}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>

              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className={cn(
                  "flex-1 transition-all duration-200 shadow-sm hover:shadow-md",
                  "hover:bg-gray-100 dark:hover:bg-slate-800",
                  "dark:text-gray-200 dark:border-slate-600",
                )}
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-2 transition-colors duration-200">
              <p>If this problem persists, please contact support.</p>
              {error?.code && (
                <p
                  className={cn(
                    "mt-1 font-mono text-xs inline-block px-2 py-1 rounded",
                    "bg-gray-100 dark:bg-slate-800 dark:text-gray-300",
                  )}
                >
                  Error Code: {error.code}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export const useErrorHandler = () => {
  const handleError = React.useCallback((error, errorInfo = {}) => {
    console.error("🚨 Manual error report:", error);

    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: errorInfo,
      });
    }
  }, []);

  return { handleError };
};

export default ErrorBoundary;
