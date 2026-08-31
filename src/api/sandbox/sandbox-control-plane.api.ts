import type { SandboxStatus } from "../conversation-service/agent-server-conversation-service.types";
import type { Backend } from "../backend-registry/types";
import { withSandboxControlPlaneClient } from "./sandbox-client.api";

export interface SandboxExposedUrl {
  name: string;
  url: string;
}

export interface SandboxInfo {
  id: string;
  created_by_user_id: string | null;
  sandbox_spec_id: string;
  status: SandboxStatus;
  session_api_key: string | null;
  exposed_urls: SandboxExposedUrl[] | null;
  created_at: string;
}

export async function batchGetSandboxInfos(
  ids: string[],
  backend?: Backend,
): Promise<(SandboxInfo | null)[]> {
  if (ids.length === 0) return [];

  const data = await withSandboxControlPlaneClient(
    (client) =>
      client.get<(SandboxInfo | null)[]>("/sandboxes", {
        params: { id: ids },
      }),
    backend,
  );

  return data ?? [];
}

export async function getSandboxExposedUrl(
  sandboxId: string,
  name: string,
  backend?: Backend,
): Promise<string | null> {
  const [sandbox] = await batchGetSandboxInfos([sandboxId], backend);
  return (
    sandbox?.exposed_urls?.find((exposedUrl) => exposedUrl.name === name)
      ?.url ?? null
  );
}
