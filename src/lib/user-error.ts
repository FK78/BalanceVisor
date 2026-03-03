import { logger } from "@/lib/logger";

/**
 * Generate a short reference code for support (e.g. "ERR-A3F8").
 * Not a UUID — just enough to find the error in the logs.
 */
function refCode(): string {
  return "ERR-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * Map known auth error messages to friendly text.
 * Supabase returns these as error.message — we intercept them here.
 */
const AUTH_ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password.",
  "Email not confirmed": "Please check your inbox and confirm your email first.",
  "User already registered": "An account with this email already exists.",
  "Password should be at least 6 characters": "Password must be at least 6 characters.",
  "Email rate limit exceeded": "Too many attempts. Please wait a moment and try again.",
  "For security purposes, you can only request this once every 60 seconds": "Please wait 60 seconds before trying again.",
};

/**
 * Convert a caught error into a safe, user-facing message.
 * Logs the real error with a reference code so support can find it.
 *
 * @param source - Logger source tag (e.g. "login", "bank-sync")
 * @param err    - The caught error
 * @param fallback - Generic message shown to the user (default provided)
 * @returns A user-safe string like "Something went wrong. Ref: ERR-A3F8"
 */
export function userError(
  source: string,
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  // Check for known auth errors that are safe to show as-is
  if (err instanceof Error) {
    const friendly = AUTH_ERROR_MAP[err.message];
    if (friendly) return friendly;
  }

  // For everything else, log the real error and return a generic message with ref code
  const ref = refCode();
  logger.error(source, `User-facing error [${ref}]`, err);
  return `${fallback} (Ref: ${ref})`;
}
