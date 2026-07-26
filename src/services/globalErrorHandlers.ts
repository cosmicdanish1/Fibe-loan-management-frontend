import { rendererLogger } from './logger';

export function initGlobalErrorHandlers(): void {
  window.onerror = (message, source, lineno, colno, error) => {
    rendererLogger.error(
      `Uncaught error: ${message}`,
      {
        source,
        lineno,
        colno,
        stack: error?.stack,
      },
    );
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    rendererLogger.error(
      `Unhandled promise rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      { stack: reason instanceof Error ? reason.stack : undefined },
    );
  });

  rendererLogger.info('Global error handlers initialized');
}
