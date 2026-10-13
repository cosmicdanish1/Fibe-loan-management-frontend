import { getApiBaseUrl } from './serverConfig';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  route: string;
  message: string;
  timestamp: string;
  data?: any;
}

const LOG_BUFFER: LogEntry[] = [];
const FLUSH_INTERVAL = 30_000; // 30 seconds
const MAX_BUFFER = 200;

function getCurrentRoute(): string {
  try {
    return window.location.hash?.replace('#', '') || window.location.pathname || '/unknown';
  } catch {
    return '/unknown';
  }
}

function createEntry(level: LogLevel, message: string, data?: any): LogEntry {
  return {
    level,
    route: getCurrentRoute(),
    message,
    timestamp: new Date().toISOString(),
    ...(data !== undefined && { data: safeSerialize(data) }),
  };
}

// Populated by installConsoleCapture() with the pristine console methods, so
// writeToConsole prints through the untouched function instead of the patched
// one below — otherwise every rendererLogger.* call would get buffered twice
// (once here, once by the console interceptor it would otherwise trigger).
const originalConsole: Partial<Record<'log' | 'warn' | 'error', (...args: any[]) => void>> = {};

function writeToConsole(entry: LogEntry): void {
  const prefix = `[${entry.timestamp.slice(11, 23)}] [${entry.level}] [${entry.route}]`;
  const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
  const fn = originalConsole[method] || console[method];
  if (entry.data !== undefined) {
    fn(prefix, entry.message, entry.data);
  } else {
    fn(prefix, entry.message);
  }
}

/** JSON.stringify that survives circular refs, DOM nodes, functions, and
 *  Errors — console.log gets called with all of those across this codebase. */
const SENSITIVE_KEYS = new Set([
  'password', 'currentpassword', 'newpassword', 'confirmpassword', 'oldpassword',
  'accesstoken', 'refreshtoken', 'token', 'authorization', 'secret', 'apikey',
]);

function safeSerialize(value: any): any {
  const seen = new WeakSet();
  const replacer = (key: string, val: any) => {
    if (key && SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ''))) return '[REDACTED]';
    if (val instanceof Error) return { name: val.name, message: val.message, stack: val.stack };
    if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
    if (typeof Node !== 'undefined' && val instanceof Node) return `[DOMNode ${val.nodeName}]`;
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  };
  try {
    const json = JSON.stringify(value, replacer);
    if (json === undefined) return String(value);
    return json.length > 20000 ? json.slice(0, 20000) + '…[truncated]' : JSON.parse(json);
  } catch {
    try {
      return String(value);
    } catch {
      return '[unserializable]';
    }
  }
}

function formatConsoleMessage(args: any[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      try {
        return JSON.stringify(safeSerialize(a));
      } catch {
        return String(a);
      }
    })
    .join(' ')
    .slice(0, 4000);
}

const CONSOLE_LEVEL: Record<'log' | 'info' | 'debug' | 'warn' | 'error', LogLevel> = {
  log: 'info',
  info: 'info',
  debug: 'debug',
  warn: 'warn',
  error: 'error',
};
let consoleCaptureInstalled = false;

/** Patches window.console so every raw console.log/info/debug/warn/error call
 *  anywhere in the app — not just calls through rendererLogger — gets shipped
 *  the same way. Installed once; the original methods still run first, so
 *  DevTools output is unchanged. */
function installConsoleCapture(): void {
  if (consoleCaptureInstalled || typeof window === 'undefined' || typeof console === 'undefined') return;
  consoleCaptureInstalled = true;

  (['log', 'info', 'debug', 'warn', 'error'] as const).forEach((method) => {
    const original = console[method]?.bind(console);
    if (!original) return;
    if (method === 'log' || method === 'warn' || method === 'error') {
      originalConsole[method] = original;
    }

    console[method] = (...args: any[]) => {
      original(...args);
      try {
        const entry = createEntry(
          CONSOLE_LEVEL[method],
          formatConsoleMessage(args),
          args.length > 0 ? args.map(safeSerialize) : undefined,
        );
        bufferForShipping(entry);
      } catch {
        /* logging must never break the app */
      }
    };
  });
}

function bufferForShipping(entry: LogEntry): void {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length >= MAX_BUFFER) {
    flushLogs();
  }
}

function getHostname(): string {
  try {
    return (window as any).electronAPI?.getHostname?.() || window.location.hostname || 'browser';
  } catch {
    return 'browser';
  }
}

async function flushLogs(): Promise<void> {
  if (LOG_BUFFER.length === 0) return;

  const batch = LOG_BUFFER.splice(0);
  try {
    // Send to main process (writes to local renderer.log)
    const eAPI = (window as any).electronAPI;
    if (eAPI?.sendLogs) {
      eAPI.sendLogs(batch);
    }
  } catch {
    // silently fail — logs already printed to console
  }

  // Ship every log level to the backend server
  try {
    const baseUrl = await getApiBaseUrl();
    // Upload in small chunks: one batch of 200 entries can exceed the server's request-size limit and be
    // rejected as a whole (ES-44), losing every log in it.
    const CHUNK = 40;
    const hostname = getHostname();
    for (let i = 0; i < batch.length; i += CHUNK) {
      fetch(`${baseUrl}/client-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname, entries: batch.slice(i, i + CHUNK) }),
      }).catch(() => { /* best effort */ });
    }
  } catch {
    // best effort — don't block UI
  }
}

// Periodic flush + capture every raw console.* call app-wide
if (typeof window !== 'undefined') {
  installConsoleCapture();
  setInterval(flushLogs, FLUSH_INTERVAL);
  window.addEventListener('beforeunload', () => flushLogs());
}

export const rendererLogger = {
  debug(message: string, data?: any): void {
    const entry = createEntry('debug', message, data);
    writeToConsole(entry);
    bufferForShipping(entry);
  },

  info(message: string, data?: any): void {
    const entry = createEntry('info', message, data);
    writeToConsole(entry);
    bufferForShipping(entry);
  },

  warn(message: string, data?: any): void {
    const entry = createEntry('warn', message, data);
    writeToConsole(entry);
    bufferForShipping(entry);
  },

  error(message: string, data?: any): void {
    const entry = createEntry('error', message, data);
    writeToConsole(entry);
    bufferForShipping(entry);
  },

  /** Every API call — request and response in full, not just failures. */
  apiCall(
    method: string,
    endpoint: string,
    status: number,
    duration: number,
    requestId?: string,
    requestBody?: any,
    responseBody?: any,
  ): void {
    // Never log bodies for auth endpoints (credentials / tokens).
    const isAuth = /\/auth(\/|\?|$)/.test(endpoint);
    const entry = createEntry(
      status >= 400 ? 'error' : 'info',
      `API ${method} ${endpoint} → ${status} (${duration}ms)`,
      isAuth
        ? { requestId, requestBody: '[omitted: auth endpoint]', responseBody: '[omitted: auth endpoint]' }
        : { requestId, requestBody, responseBody },
    );
    writeToConsole(entry);
    bufferForShipping(entry);
  },
};

export default rendererLogger;
