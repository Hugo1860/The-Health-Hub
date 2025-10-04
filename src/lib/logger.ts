type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getEnabledLevel(): LogLevel {
  const env = (process.env.DEBUG_API || '').toLowerCase();
  if (env === 'debug' || env === '1' || env === 'true') return 'debug';
  if (env === 'info') return 'info';
  if (env === 'warn') return 'warn';
  return 'error';
}

const enabledLevel = getEnabledLevel();

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[enabledLevel];
}

function format(prefix: string, message?: any, ...optionalParams: any[]): any[] {
  const ts = new Date().toISOString();
  return [`[${ts}] ${prefix}`, message, ...optionalParams];
}

export const logger = {
  debug(message?: any, ...optionalParams: any[]) {
    if (shouldLog('debug')) console.log(...format('[DEBUG]', message, ...optionalParams));
  },
  info(message?: any, ...optionalParams: any[]) {
    if (shouldLog('info')) console.info(...format('[INFO]', message, ...optionalParams));
  },
  warn(message?: any, ...optionalParams: any[]) {
    if (shouldLog('warn')) console.warn(...format('[WARN]', message, ...optionalParams));
  },
  error(message?: any, ...optionalParams: any[]) {
    if (shouldLog('error')) console.error(...format('[ERROR]', message, ...optionalParams));
  },
};

export default logger;


