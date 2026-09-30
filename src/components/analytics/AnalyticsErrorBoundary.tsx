import React, { Component, ErrorInfo, ReactNode } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { rendererLogger } from '../../services/logger';

interface Props {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Track error with analytics
    this.trackError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    rendererLogger.error(
      `React ErrorBoundary [${this.props.componentName || 'unknown'}]: ${error.message}`,
      { stack: error.stack, componentStack: errorInfo.componentStack },
    );
  }

  private trackError(error: Error, errorInfo: ErrorInfo) {
    try {
      // Extract component stack information
      const componentStack = errorInfo.componentStack;
      const componentName = this.props.componentName || this.extractComponentName(componentStack);
      
      // Get user action context (if available)
      const userAction = this.getUserActionContext();

      // Track the error
      analyticsService.trackError({
        sessionId: analyticsService.getSessionId() || '',
        errorType: 'javascript',
        severityLevel: this.determineSeverityLevel(error),
        errorMessage: error.message,
        stackTrace: error.stack,
        componentName,
        fileName: this.extractFileName(error.stack),
        lineNumber: this.extractLineNumber(error.stack),
        columnNumber: this.extractColumnNumber(error.stack),
        userActionBeforeError: userAction,
        browserConsoleLog: this.getBrowserConsoleLog(),
        networkStatus: navigator.onLine ? 'online' : 'offline',
      });
    } catch (trackingError) {
      console.warn('Failed to track error with analytics:', trackingError);
    }
  }

  private extractComponentName(componentStack: string): string {
    // Extract the first component name from the stack
    const match = componentStack.match(/^\s*in (\w+)/);
    return match ? match[1] : 'UnknownComponent';
  }

  private determineSeverityLevel(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    // Critical errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'critical';
    }
    
    // High severity errors
    if (message.includes('cannot read') || message.includes('undefined') || message.includes('null')) {
      return 'high';
    }
    
    // Medium severity errors
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'medium';
    }
    
    // Default to medium
    return 'medium';
  }

  private extractFileName(stackTrace?: string): string | undefined {
    if (!stackTrace) return undefined;
    
    const match = stackTrace.match(/at .* \((.+):(\d+):(\d+)\)/);
    if (match && match[1]) {
      const fullPath = match[1];
      return fullPath.split('/').pop() || fullPath;
    }
    
    return undefined;
  }

  private extractLineNumber(stackTrace?: string): number | undefined {
    if (!stackTrace) return undefined;
    
    const match = stackTrace.match(/at .* \(.+:(\d+):\d+\)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractColumnNumber(stackTrace?: string): number | undefined {
    if (!stackTrace) return undefined;
    
    const match = stackTrace.match(/at .* \(.+:\d+:(\d+)\)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private getUserActionContext(): string {
    // Try to get recent user actions from various sources
    const recentActions: string[] = [];
    
    // Check for recent clicks
    const lastClickedElement = document.activeElement;
    if (lastClickedElement && lastClickedElement.tagName) {
      const elementInfo = `${lastClickedElement.tagName}${lastClickedElement.id ? `#${lastClickedElement.id}` : ''}${lastClickedElement.className ? `.${lastClickedElement.className.split(' ')[0]}` : ''}`;
      recentActions.push(`Clicked: ${elementInfo}`);
    }
    
    // Check current URL
    recentActions.push(`Page: ${window.location.pathname}`);
    
    // Check if there were recent form submissions
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
      recentActions.push(`Forms on page: ${forms.length}`);
    }
    
    return recentActions.join(', ');
  }

  private getBrowserConsoleLog(): string {
    // In a real implementation, you might want to capture console logs
    // For now, return basic browser info
    return `Browser: ${navigator.userAgent.split(' ')[0]}, Viewport: ${window.innerWidth}x${window.innerHeight}`;
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary-container" style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#c92a2a',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
            ⚠️ Something went wrong
          </h2>
          
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.4' }}>
            An unexpected error occurred in the {this.props.componentName || 'application'}. 
            The error has been logged and will be reviewed by our development team.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginBottom: '16px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                Error Details (Development Mode)
              </summary>
              <pre style={{
                fontSize: '11px',
                backgroundColor: '#f8f9fa',
                padding: '8px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px',
                marginTop: '8px'
              }}>
                {this.state.error.message}
                {this.state.error.stack && `\n\nStack Trace:\n${this.state.error.stack}`}
                {this.state.errorInfo?.componentStack && `\n\nComponent Stack:${this.state.errorInfo.componentStack}`}
              </pre>
            </details>
          )}
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '8px 16px',
                backgroundColor: '#228be6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export const withAnalyticsErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  fallback?: ReactNode
) => {
  const WithErrorBoundary = (props: P) => (
    <AnalyticsErrorBoundary componentName={componentName} fallback={fallback}>
      <WrappedComponent {...props} />
    </AnalyticsErrorBoundary>
  );

  WithErrorBoundary.displayName = `withAnalyticsErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundary;
};
