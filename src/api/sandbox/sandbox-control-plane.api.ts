import type { CloudSandboxInfo } from "@openhands/typescript-client/clients";
import type { Backend } from "../backend-registry/types";
import { withSandboxControlPlaneClient } from "./sandbox-client.api";

export type SandboxInfo = CloudSandboxInfo;

export async function batchGetSandboxInfos(
  ids: string[],
  backend?: Backend,
): Promise<(SandboxInfo | null)[]> {
  if (ids.length === 0) return [];

  const data = await withSandboxControlPlaneClient(
    (client) => client.getSandboxes(ids),
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
