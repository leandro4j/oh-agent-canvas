import { ServerClient } from "@openhands/typescript-client/clients";
import type { Backend } from "../backend-registry/types";
import { isSdkHttpStatusError } from "../agent-server-compatibility";
import { createSandboxControlPlaneClient } from "./sandbox-client.api";

export const SANDBOX_HEALTH_PATH = "/health";
export const SANDBOX_SETTINGS_PATH = "/api/v1/settings";
export const SANDBOX_SERVER_UNREACHABLE_ERROR = "Sandbox Server unreachable";
export const INVALID_SANDBOX_BACKEND_API_KEY_ERROR =
  "Invalid Sandbox Server API key";

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
  const healthClient = new ServerClient({
    host: backend.host,
    timeout: timeoutMs,
  });
  try {
    await healthClient.getHealth();
  } catch (error) {
    throw unavailableError(error);
  } finally {
    healthClient.close();
  }

  const settingsClient = createSandboxControlPlaneClient(
    {
      id: "sandbox-validation",
      name: "Sandbox",
      host: backend.host,
      apiKey: backend.apiKey,
      kind: "sandbox",
    },
    timeoutMs,
  );
  try {
    await settingsClient.getSettings();
  } catch (error) {
    if (isSdkHttpStatusError(error, 401) || isSdkHttpStatusError(error, 403)) {
      throw new Error(INVALID_SANDBOX_BACKEND_API_KEY_ERROR);
    }
    throw unavailableError(error);
  } finally {
    settingsClient.close();
  }
}
