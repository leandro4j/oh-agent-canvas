import type { Backend } from "./types";
import { usesManagedCloud } from "./capabilities";

/**
 * Build the auth headers to send to a backend.
 *
 * Direct-runtime backends use `X-Session-API-Key`. Managed Cloud expects a
 * bearer token in the `Authorization` header.
 */
export function buildAuthHeaders(backend: Backend): Record<string, string> {
  if (usesManagedCloud(backend) && backend.authMode === "cookie") return {};
  if (!backend.apiKey) return {};

  if (usesManagedCloud(backend)) {
    return { Authorization: `Bearer ${backend.apiKey}` };
  }

  return { "X-Session-API-Key": backend.apiKey };
}
