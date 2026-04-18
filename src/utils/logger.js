// Quantyval AI - Logging System
// Production-ready logger with multiple transports

export class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info'; // debug, info, warn, error
    this.prefix = options.prefix || 'Quantyval';
    this.transports = options.transports || ['console'];
    this.colors = {
      debug: '\x1b[36m',   // cyan
      info: '\x1b[32m',    // green
      warn: '\x1b[33m',   // yellow
      error: '\x1b[31m',  // red
      reset: '\x1b[0m',
    };
    
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
  }
  
  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }
  
  format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} ${this.prefix}: ${message}${metaStr}`;
  }
  
  debug(message, meta) {
    if (this.shouldLog('debug')) {
      console.log(`${this.colors.debug}${this.format('debug', message, meta)}${this.colors.reset}`);
    }
  }
  
  info(message, meta) {
    if (this.shouldLog('info')) {
      console.log(`${this.colors.info}${this.format('info', message, meta)}${this.colors.reset}`);
    }
  }
  
  warn(message, meta) {
    if (this.shouldLog('warn')) {
      console.warn(`${this.colors.warn}${this.format('warn', message, meta)}${this.colors.reset}`);
    }
  }
  
  error(message, meta) {
    if (this.shouldLog('error')) {
      console.error(`${this.colors.error}${this.format('error', message, meta)}${this.colors.reset}`);
    }
  }
  
  // Child logger with prefix
  child(prefix) {
    return new Logger({ ...this, prefix: `${this.prefix}:${prefix}` });
  }
}

// File transport
export class FileLogger extends Logger {
  constructor(options = {}) {
    super(options);
    this.filename = options.filename || 'quantyval.log';
    this.fs = null;
    this.init();
  }
  
  async init() {
    try {
      this.fs = await import('fs/promises');
      // Ensure log directory exists
      const path = await import('path');
      const dir = path.dirname(this.filename);
      if (dir !== '.') {
        await this.fs.mkdir(dir, { recursive: true });
      }
    } catch (e) {
      // Fallback to console only
    }
  }
  
  async write(level, message, meta) {
    if (!this.fs) return;
    try {
      const line = this.format(level, message, meta) + '\n';
      await this.fs.appendFile(this.filename, line);
    } catch (e) {
      console.error('Log write failed:', e.message);
    }
  }
  
  debug(message, meta) { super.debug(message, meta); this.write('debug', message, meta); }
  info(message, meta) { super.info(message, meta); this.write('info', message, meta); }
  warn(message, meta) { super.warn(message, meta); this.write('warn', message, meta); }
  error(message, meta) { super.error(message, meta); this.write('error', message, meta); }
}

// Structured JSON logger (for log aggregation)
export class JSONLogger extends Logger {
  constructor(options = {}) {
    super(options);
    this.output = options.output || 'json'; // json, console
  }
  
  log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      prefix: this.prefix,
      message,
      ...meta,
    };
    
    if (this.output === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      super.log(level, message, meta);
    }
  }
  
  debug(message, meta) { this.log('debug', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  error(message, meta) { this.log('error', message, meta); }
}

// Default instance
export const logger = new Logger({
  prefix: 'Quantyval',
  level: process.env.LOG_LEVEL || 'info',
});

// Export factory
export function createLogger(options) {
  if (options.json) {
    return new JSONLogger(options);
  }
  if (options.file) {
    return new FileLogger(options);
  }
  return new Logger(options);
}