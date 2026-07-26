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
    ...(data !== undefined && { data }),
  };
}

function writeToConsole(entry: LogEntry): void {
  const prefix = `[${entry.timestamp.slice(11, 23)}] [${entry.level}] [${entry.route}]`;
  const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
  if (entry.data !== undefined) {
    console[method](prefix, entry.message, entry.data);
  } else {
    console[method](prefix, entry.message);
  }
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

  // Ship error/warn logs to backend server
  try {
    const baseUrl = await getApiBaseUrl();
    fetch(`${baseUrl}/client-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname: getHostname(), entries: batch }),
    }).catch(() => { /* best effort */ });
  } catch {
    // best effort — don't block UI
  }
}

// Periodic flush
if (typeof window !== 'undefined') {
  setInterval(flushLogs, FLUSH_INTERVAL);
  window.addEventListener('beforeunload', () => flushLogs());
}

export const rendererLogger = {
  debug(message: string, data?: any): void {
    const entry = createEntry('debug', message, data);
    writeToConsole(entry);
  },

  info(message: string, data?: any): void {
    const entry = createEntry('info', message, data);
    writeToConsole(entry);
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

  apiCall(method: string, endpoint: string, status: number, duration: number, requestId?: string): void {
    const entry = createEntry(
      status >= 400 ? 'error' : 'info',
      `API ${method} ${endpoint} → ${status} (${duration}ms)`,
      { requestId },
    );
    writeToConsole(entry);
    if (status >= 400) {
      bufferForShipping(entry);
    }
  },
};

export default rendererLogger;
