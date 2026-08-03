import log from 'electron-log';
import * as path from 'path';
import { app } from 'electron';

/**
 * Logs live next to the installed .exe (e.g. C:\Program Files\Fibe Loan
 * Management\logs\) instead of the hidden AppData\Roaming folder, so a
 * technician can find them the same way as the backend's
 * C:\FibeServer\backend\logs\ — no need to know where userData lives.
 *
 * Program Files is admin-only by default. installer.nsh pre-creates this
 * "logs" folder at install time and grants BUILTIN\Users write access to it
 * specifically (same pattern already used for server-config.json), so the
 * app can write here without running elevated.
 *
 * In dev (unpackaged) app.getPath('exe') points at the Electron binary
 * inside node_modules, which is not useful — fall back to userData there.
 */
export function resolveLogDir(): string {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'logs');
  }
  return path.join(app.getPath('userData'), 'logs');
}

export function initMainLogger(): typeof log {
  const logDir = resolveLogDir();

  log.transports.file.resolvePathFn = (variables) => {
    return path.join(logDir, variables.fileName || 'main.log');
  };

  log.transports.file.maxSize = 10 * 1024 * 1024; // 10 MB
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

  log.transports.console.format = '{h}:{i}:{s} [{level}] {text}';

  log.errorHandler.startCatching();

  log.info('=== Application starting ===');
  log.info(`Log directory: ${logDir}`);
  log.info(`App version: ${app.getVersion()}`);
  log.info(`Electron: ${process.versions.electron}, Chrome: ${process.versions.chrome}`);

  return log;
}

export default log;
