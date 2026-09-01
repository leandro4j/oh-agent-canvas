import {
  CloudClient,
  type CloudRequestOptions,
} from "@openhands/typescript-client/clients";
import { getActiveBackend } from "../backend-registry/active-store";
import type { Backend } from "../backend-registry/types";
import { isSandboxBackend } from "../backend-registry/capabilities";

export const SANDBOX_CONTROL_PLANE_TIMEOUT_MS = 5 * 60 * 1000;

function requireSandboxBackend(backend: Backend): Backend {
  if (!isSandboxBackend(backend)) {
    throw new Error("Sandbox control-plane calls require a sandbox backend.");
  }
  return backend;
}

export type SandboxControlPlaneClient = CloudClient & {
  readonly controlPlaneSessionApiKey: string | undefined;
};

export function createSandboxControlPlaneClient(
  backend: Backend,
  timeout = SANDBOX_CONTROL_PLANE_TIMEOUT_MS,
): SandboxControlPlaneClient {
  const sandbox = requireSandboxBackend(backend);
  const client = new CloudClient({ host: sandbox.host, timeout });
  const controlPlaneSessionApiKey = sandbox.apiKey || undefined;
  const request = client.request.bind(client);

  Object.defineProperty(client, "controlPlaneSessionApiKey", {
    configurable: false,
    enumerable: true,
    value: controlPlaneSessionApiKey,
    writable: false,
  });
  client.request = <TResponse = unknown>(options: CloudRequestOptions) =>
    request<TResponse>({
      ...options,
      authMode: "session-api-key",
      sessionApiKey: controlPlaneSessionApiKey,
    });

  return client as SandboxControlPlaneClient;
}

/** Run one control-plane operation and always release the typed client. */
export async function withSandboxControlPlaneClient<T>(
  operation: (client: SandboxControlPlaneClient) => Promise<T>,
  backend: Backend = getActiveBackend().backend,
  timeout = SANDBOX_CONTROL_PLANE_TIMEOUT_MS,
): Promise<T> {
  const client = createSandboxControlPlaneClient(backend, timeout);
  try {
    return await operation(client);
  } finally {
    client.close();
  }
}
