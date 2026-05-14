import { HTTP_STATUS } from "@keeper.sh/constants";
import type { ZohoApiError } from "../types";

/**
 * Zoho returns errors with `code` that can be either numeric or string.
 * Known scope-related codes include INVALID_OAUTHSCOPE — we treat those as
 * auth errors that require reauthentication.
 *
 * Validated against Zoho Calendar REST API on 2026-05-13.
 */
const ZOHO_AUTH_ERROR_CODES = new Set<string>([
  "INVALID_OAUTHSCOPE",
  "INVALID_OAUTHTOKEN",
  "INVALID_TOKEN",
  "OAUTH_SCOPE_MISMATCH",
]);

const hasRateLimitMessage = (message: string | undefined): boolean => {
  if (!message) {
    return false;
  }
  return message.includes("429") || message.toLowerCase().includes("rate limit");
};

const normalizeCode = (code: ZohoApiError["code"]): string | null => {
  if (typeof code === "string") {
    return code;
  }
  if (typeof code === "number") {
    return String(code);
  }
  return null;
};

const isAuthError = (status: number, error: ZohoApiError | undefined): boolean => {
  if (status === HTTP_STATUS.UNAUTHORIZED) {
    return true;
  }

  const normalizedCode = normalizeCode(error?.code);

  if (status === HTTP_STATUS.FORBIDDEN) {
    if (!normalizedCode) {
      return true;
    }
    return ZOHO_AUTH_ERROR_CODES.has(normalizedCode);
  }

  if (normalizedCode && ZOHO_AUTH_ERROR_CODES.has(normalizedCode)) {
    return true;
  }

  return false;
};

const isSimpleAuthError = (status: number): boolean =>
  status === HTTP_STATUS.UNAUTHORIZED || status === HTTP_STATUS.FORBIDDEN;

export { hasRateLimitMessage, isAuthError, isSimpleAuthError, ZOHO_AUTH_ERROR_CODES };
