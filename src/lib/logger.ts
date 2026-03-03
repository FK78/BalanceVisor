/**
 * Central error logger.
 *
 * Wraps console.error with structured context so every logged error
 * includes *where* it happened and *what* was being attempted.
 *
 * To swap in a real service (Sentry, Axiom, Datadog, etc.) later,
 * just change the `dispatch` function — every call site stays the same.
 */

type LogLevel = "error" | "warn" | "info";

interface LogEntry {
  level: LogLevel;
  source: string;
  message: string;
  error?: unknown;
  meta?: Record<string, unknown>;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function dispatch(entry: LogEntry) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`;

  const parts: string[] = [prefix, entry.message];
  if (entry.error) parts.push(`→ ${formatError(entry.error)}`);
  if (entry.meta && Object.keys(entry.meta).length > 0) {
    parts.push(`| ${JSON.stringify(entry.meta)}`);
  }

  switch (entry.level) {
    case "error":
      console.error(parts.join(" "));
      break;
    case "warn":
      console.warn(parts.join(" "));
      break;
    default:
      console.log(parts.join(" "));
  }

  // Future: send to Sentry, Axiom, etc.
  // if (entry.level === "error") Sentry.captureException(entry.error);
}

export const logger = {
  error(source: string, message: string, error?: unknown, meta?: Record<string, unknown>) {
    dispatch({ level: "error", source, message, error, meta });
  },

  warn(source: string, message: string, meta?: Record<string, unknown>) {
    dispatch({ level: "warn", source, message, meta });
  },

  info(source: string, message: string, meta?: Record<string, unknown>) {
    dispatch({ level: "info", source, message, meta });
  },
};
