import { buildHttpBaseUrl } from "#/utils/websocket-url";
import { getAgentServerWorkingDir } from "./agent-server-config";
import {
  getActiveBackend,
  getEffectiveDirectRuntimeBackend,
} from "./backend-registry/active-store";
import type { Backend } from "./backend-registry/types";

export interface AgentServerClientOverrides {
  host?: string;
  apiKey?: string | null;
  sessionApiKey?: string | null;
  workingDir?: string;
  conversationUrl?: string | null;
  timeout?: number;
}

export interface AgentServerClientOptions {
  host: string;
  apiKey?: string;
  workingDir: string;
  timeout?: number;
}

export class NoBackendAvailableError extends Error {
  constructor() {
    super("No backend is configured.");
    this.name = "NoBackendAvailableError";
  }
}

export const isNoBackendAvailableError = (
  error: unknown,
): error is NoBackendAvailableError =>
  error instanceof NoBackendAvailableError ||
  (typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "NoBackendAvailableError");

function normalizeHost(host: string): string {
  return host.replace(/\/+$/, "");
}

function resolveHost(
  overrides: AgentServerClientOverrides,
  backend: Backend | null,
): string {
  if (overrides.host) return normalizeHost(overrides.host);
  if (overrides.conversationUrl)
    return normalizeHost(buildHttpBaseUrl(overrides.conversationUrl));
  return normalizeHost(backend?.host ?? "");
}

export function getAgentServerClientOptions(
  overrides: AgentServerClientOverrides = {},
): AgentServerClientOptions {
  const activeBackend = getActiveBackend().backend;
  const backend = getEffectiveDirectRuntimeBackend();
  const hasExplicitRuntime = !!overrides.host || !!overrides.conversationUrl;

  // A Sandbox backend's host is the control plane, not an Agent Server. Every
  // direct runtime call must carry the URL/key pair returned for its
  // conversation; falling back to the control-plane host would silently send
  // `/api/...` requests to the wrong service.
  if (activeBackend.kind === "sandbox" && !hasExplicitRuntime) {
    throw new NoBackendAvailableError();
  }

  if (!backend && !overrides.host && !overrides.conversationUrl) {
    throw new NoBackendAvailableError();
  }

  const apiKey =
    overrides.sessionApiKey ??
    overrides.apiKey ??
    (activeBackend.kind === "sandbox" && hasExplicitRuntime
      ? undefined
      : backend?.apiKey);

  return {
    host: resolveHost(overrides, backend),
    ...(apiKey ? { apiKey } : {}),
    workingDir: overrides.workingDir ?? getAgentServerWorkingDir(),
    ...(overrides.timeout !== undefined ? { timeout: overrides.timeout } : {}),
  };
}

export function getAgentServerHttpClientOptions(
  overrides?: AgentServerClientOverrides,
) {
  const { host, apiKey, timeout } = getAgentServerClientOptions(overrides);
  return {
    baseUrl: host,
    ...(apiKey ? { apiKey } : {}),
    timeout: timeout ?? 60000,
  };
}
