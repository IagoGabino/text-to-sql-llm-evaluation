import fs from 'fs';
import path from 'path';
import { loggingConfig } from '../../config/environment';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Logger service for structured logging
 * Logs to both console and file with JSON formatting
 */
class Logger {
  private logDir: string;
  private logFile: string;
  private currentDate: string;

  constructor() {
    this.logFile = loggingConfig.filePath;
    this.logDir = path.dirname(this.logFile);
    this.currentDate = this.getDateString();
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get current date string for log rotation
   */
  private getDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }

  /**
   * Get rotated log file path
   */
  private getRotatedLogPath(): string {
    const ext = path.extname(this.logFile);
    const base = path.basename(this.logFile, ext);
    const dir = path.dirname(this.logFile);
    return path.join(dir, `${base}-${this.currentDate}${ext}`);
  }

  /**
   * Check if log rotation is needed
   */
  private checkRotation(): void {
    const today = this.getDateString();
    if (today !== this.currentDate) {
      this.currentDate = today;
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: LogEntry): void {
    this.checkRotation();
    const logPath = this.getRotatedLogPath();
    const logLine = JSON.stringify(entry) + '\n';

    try {
      fs.appendFileSync(logPath, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Format and output log to console
   */
  private writeToConsole(entry: LogEntry): void {
    const levelColors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    };

    const reset = '\x1b[0m';
    const color = levelColors[entry.level];
    const time = new Date(entry.timestamp).toLocaleTimeString();

    let message = `${color}[${entry.level.toUpperCase()}]${reset} ${time} - ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n${entry.error.stack}`;
      }
    }

    console.log(message);
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    // Check if this log level should be output
    const configuredLevel = loggingConfig.level;
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configuredIndex = levels.indexOf(configuredLevel as LogLevel);
    const currentIndex = levels.indexOf(level);

    if (currentIndex < configuredIndex) {
      return;
    }

    const entry = this.createLogEntry(level, message, context, error);

    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Read log entries from file
   */
  public readLogs(date?: string): LogEntry[] {
    const logPath = date
      ? path.join(this.logDir, `${path.basename(this.logFile, '.log')}-${date}.log`)
      : this.getRotatedLogPath();

    if (!fs.existsSync(logPath)) {
      return [];
    }

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n');

    return lines
      .filter((line: string) => line.length > 0)
      .map((line: string) => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry: LogEntry | null): entry is LogEntry => entry !== null);
  }

  /**
   * Clear old log files (keep last N days)
   */
  public cleanOldLogs(daysToKeep: number = 7): void {
    if (!fs.existsSync(this.logDir)) {
      return;
    }

    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

    fs.readdirSync(this.logDir).forEach((file: string) => {
      const filePath = path.join(this.logDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        this.info(`Deleted old log file: ${file}`);
      }
    });
  }
}

// Export singleton instance
export const logger = new Logger();
