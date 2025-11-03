// Production-ready logger utility
type LogLevel = "info" | "warn" | "error" | "debug";

interface LoggerOptions {
  context?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private context: string;
  private isDevelopment = process.env.NODE_ENV === "development";

  constructor(context: string = "App") {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, options?: LoggerOptions): string {
    const timestamp = new Date().toISOString();
    const ctx = options?.context || this.context;
    return `[${timestamp}] [${level.toUpperCase()}] [${ctx}] ${message}`;
  }

  info(message: string, options?: LoggerOptions): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage("info", message, options), options?.metadata || "");
    }
  }

  warn(message: string, options?: LoggerOptions): void {
    console.warn(this.formatMessage("warn", message, options), options?.metadata || "");
  }

  error(message: string, error?: Error | unknown, options?: LoggerOptions): void {
    console.error(this.formatMessage("error", message, options), error, options?.metadata || "");
  }

  debug(message: string, options?: LoggerOptions): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage("debug", message, options), options?.metadata || "");
    }
  }
}

// Export singleton instances pre rôzne kontexty
export const logger = new Logger();
export const apiLogger = new Logger("API");
export const dbLogger = new Logger("Database");
export const cacheLogger = new Logger("Cache");

export default Logger;
