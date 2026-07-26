import log from 'electron-log';
import * as path from 'path';
import { app } from 'electron';

export function initMainLogger(): typeof log {
  const logDir = path.join(app.getPath('userData'), 'logs');

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
