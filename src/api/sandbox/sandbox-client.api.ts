import { AgentServerClient } from "@openhands/typescript-client/clients";
import { getAgentServerClientOptions } from "../agent-server-client-options";
import { getActiveBackend } from "../backend-registry/active-store";
import type { Backend } from "../backend-registry/types";

export const SANDBOX_CONTROL_PLANE_PREFIX = "/api/v1";
export const SANDBOX_CONTROL_PLANE_TIMEOUT_MS = 5 * 60 * 1000;

function requireSandboxBackend(backend: Backend): Backend {
  if (backend.kind !== "sandbox") {
    throw new Error("Sandbox control-plane calls require a sandbox backend.");
  }
  return backend;
}

/**
 * Construct the typed client for Sandbox Server's control plane.
 *
 * The Agent Server client is used only for its generic request surface here:
 * Sandbox Server mounts its own API below `/api/v1`, while the returned
 * conversation runtime is addressed separately by the regular typed clients.
 */
export function createSandboxControlPlaneClient(
  backend: Backend,
  timeout = SANDBOX_CONTROL_PLANE_TIMEOUT_MS,
): AgentServerClient {
  const sandbox = requireSandboxBackend(backend);
  const options = getAgentServerClientOptions({
    host: `${sandbox.host.replace(/\/+$/, "")}${SANDBOX_CONTROL_PLANE_PREFIX}`,
    apiKey: sandbox.apiKey,
    timeout,
  });

  return new AgentServerClient({
    host: options.host,
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
  });
}

/** Run one control-plane operation and always release the typed client. */
export async function withSandboxControlPlaneClient<T>(
  operation: (client: AgentServerClient) => Promise<T>,
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
