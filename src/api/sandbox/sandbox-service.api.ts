import type { Backend } from "../backend-registry/types";

export const SANDBOX_HEALTH_PATH = "/health";
export const SANDBOX_SETTINGS_PATH = "/api/v1/settings";
export const SANDBOX_SERVER_UNREACHABLE_ERROR = "Sandbox Server unreachable";
export const INVALID_SANDBOX_BACKEND_API_KEY_ERROR =
  "Invalid Sandbox Server API key";

function buildSandboxUrl(host: string, path: string): string {
  return `${host.replace(/\/+$/, "")}${path}`;
}

async function getSandboxEndpoint(
  url: string,
  timeoutMs: number,
  headers?: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      ...(headers ? { headers } : {}),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function unavailableError(cause?: unknown): Error {
  return new Error(SANDBOX_SERVER_UNREACHABLE_ERROR, { cause });
}

/**
 * Validate the Sandbox Server control plane in two ordered steps:
 * 1. public GET /health proves that the host is reachable;
 * 2. authenticated GET /api/v1/settings proves the supplied control-plane key.
 */
export async function validateSandboxBackend(
  backend: Readonly<Pick<Backend, "host" | "apiKey">>,
  timeoutMs: number,
): Promise<void> {
  let healthResponse: Response;
  try {
    healthResponse = await getSandboxEndpoint(
      buildSandboxUrl(backend.host, SANDBOX_HEALTH_PATH),
      timeoutMs,
    );
  } catch (error) {
    throw unavailableError(error);
  }

  if (!healthResponse.ok) {
    throw unavailableError();
  }

  let settingsResponse: Response;
  try {
    settingsResponse = await getSandboxEndpoint(
      buildSandboxUrl(backend.host, SANDBOX_SETTINGS_PATH),
      timeoutMs,
      { "X-Session-API-Key": backend.apiKey },
    );
  } catch (error) {
    throw unavailableError(error);
  }

  if (settingsResponse.status === 401 || settingsResponse.status === 403) {
    throw new Error(INVALID_SANDBOX_BACKEND_API_KEY_ERROR);
  }

  if (!settingsResponse.ok) {
    throw unavailableError();
  }
}
