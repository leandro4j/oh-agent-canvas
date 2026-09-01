import { describe, expect, it } from "vitest";
import {
  BACKEND_CAPABILITIES,
  getBackendCapabilities,
  isCloudBackend,
  isLocalBackend,
  isSandboxBackend,
  usesControlPlane,
  usesDirectRuntime,
  usesManagedCloud,
} from "#/api/backend-registry/capabilities";
import type { BackendKind } from "#/api/backend-registry/types";

describe("backend capabilities", () => {
  it.each([
    ["local", false, false, true],
    ["cloud", true, true, false],
    ["sandbox", true, false, true],
  ] as const)(
    "maps %s to control-plane=%s, managed-cloud=%s, direct-runtime=%s",
    (
      kind,
      expectedControlPlane,
      expectedManagedCloud,
      expectedDirectRuntime,
    ) => {
      const backend: { kind: BackendKind } = { kind };

      expect(getBackendCapabilities(backend)).toEqual({
        usesControlPlane: expectedControlPlane,
        usesManagedCloud: expectedManagedCloud,
        usesDirectRuntime: expectedDirectRuntime,
      });
      expect(usesControlPlane(backend)).toBe(expectedControlPlane);
      expect(usesManagedCloud(backend)).toBe(expectedManagedCloud);
      expect(usesDirectRuntime(backend)).toBe(expectedDirectRuntime);
    },
  );

  it("publishes one immutable capability table for every backend kind", () => {
    expect(Object.keys(BACKEND_CAPABILITIES)).toEqual([
      "local",
      "cloud",
      "sandbox",
    ]);
  });

  it.each([
    ["local", true, false, false],
    ["cloud", false, true, false],
    ["sandbox", false, false, true],
  ] as const)(
    "derives the %s backend mode from capabilities",
    (kind, local, cloud, sandbox) => {
      expect(isLocalBackend(kind)).toBe(local);
      expect(isCloudBackend(kind)).toBe(cloud);
      expect(isSandboxBackend(kind)).toBe(sandbox);
    },
  );
});
