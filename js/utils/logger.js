/**
 * Small configurable logger used by application modules.
 * Debug logging is disabled by default in production.
 */

const LEVELS = Object.freeze({ DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 });

function write(level, scope, message, ...args) {
  const prefix = `[${scope}]`;
  const method = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : level === 'DEBUG' ? console.debug : console.info;
  method(`${prefix} ${message}`, ...args);
}

export function createLogger(scope = 'App') {
  const minLevel = LEVELS.INFO;
  return {
    debug(message, ...args) {
      if (LEVELS.DEBUG >= minLevel) write('DEBUG', scope, message, ...args);
    },
    info(message, ...args) {
      if (LEVELS.INFO >= minLevel) write('INFO', scope, message, ...args);
    },
    warn(message, ...args) {
      if (LEVELS.WARN >= minLevel) write('WARN', scope, message, ...args);
    },
    error(message, ...args) {
      write('ERROR', scope, message, ...args);
    }
  };
}

export default createLogger;
