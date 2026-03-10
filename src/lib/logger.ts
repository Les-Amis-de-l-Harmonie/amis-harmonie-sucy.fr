import { env } from "cloudflare:workers";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: number;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
}

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

function isLogLevel(value: string | undefined): value is LogLevel {
  return value !== undefined && LOG_LEVELS.includes(value as LogLevel);
}

function resolveLogLevel(): LogLevel {
  const configuredValue = (env as unknown as Record<string, string | undefined>).LOG_LEVEL;
  const configuredLevel = configuredValue?.toLowerCase();
  if (isLogLevel(configuredLevel)) {
    return configuredLevel;
  }

  return import.meta.env.DEV ? "debug" : "info";
}

function getErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      error: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  if (error !== undefined) {
    return { error };
  }

  return {};
}

class Logger {
  private readonly level: LogLevel;

  constructor(level: LogLevel = resolveLogLevel()) {
    this.level = level;
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.log("error", message, {
      ...context,
      ...getErrorDetails(error),
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ?? {}),
    };

    const serializedEntry = JSON.stringify(entry);

    if (level === "error") {
      console.error(serializedEntry);
      return;
    }

    if (level === "warn") {
      console.warn(serializedEntry);
      return;
    }

    if (level === "info") {
      // eslint-disable-next-line no-console
      console.info(serializedEntry);
      return;
    }

    // eslint-disable-next-line no-console
    console.debug(serializedEntry);
  }
}

export function getRequestLogContext(request: Request, context: LogContext = {}): LogContext {
  const url = new URL(request.url);
  const requestId =
    request.headers.get("x-request-id") ?? request.headers.get("cf-ray") ?? undefined;

  return {
    requestId,
    path: url.pathname,
    method: request.method,
    ...context,
  };
}

export const logger = new Logger();
