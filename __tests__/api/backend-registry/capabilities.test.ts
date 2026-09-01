import { describe, expect, it } from "vitest";
import {
  BACKEND_CAPABILITIES,
  getBackendCapabilities,
  supportsBackendFeature,
  usesControlPlane,
  usesDirectRuntime,
  usesManagedCloud,
} from "#/api/backend-registry/capabilities";
import type { BackendKind } from "#/api/backend-registry/types";

describe("backend capabilities", () => {
  it.each([
    ["local", false, false, true, true],
    ["cloud", true, true, false, false],
    ["sandbox", true, false, true, false],
  ] as const)(
    "maps %s to control-plane=%s, managed-cloud=%s, direct-runtime=%s",
    (
      kind,
      expectedControlPlane,
      expectedManagedCloud,
      expectedDirectRuntime,
      expectedPlugins,
    ) => {
      const backend: { kind: BackendKind } = { kind };

      expect(getBackendCapabilities(backend)).toEqual({
        usesControlPlane: expectedControlPlane,
        usesManagedCloud: expectedManagedCloud,
        usesDirectRuntime: expectedDirectRuntime,
        features: expect.objectContaining({ plugins: expectedPlugins }),
      });
      expect(usesControlPlane(backend)).toBe(expectedControlPlane);
      expect(usesManagedCloud(backend)).toBe(expectedManagedCloud);
      expect(usesDirectRuntime(backend)).toBe(expectedDirectRuntime);
      expect(supportsBackendFeature(backend, "plugins")).toBe(expectedPlugins);
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
    ["local", true, true, true, true, true, true],
    ["cloud", true, false, true, false, false, true],
    ["sandbox", false, false, false, false, false, false],
  ] as const)(
    "publishes the %s feature policy",
    (
      kind,
      agentProfiles,
      canvasExtensions,
      llmProfileDuplication,
      llmSubscriptionAuth,
      plugins,
      telemetry,
    ) => {
      expect(getBackendCapabilities(kind).features).toEqual({
        agentProfiles,
        canvasExtensions,
        llmProfileDuplication,
        llmSubscriptionAuth,
        plugins,
        telemetry,
      });
    },
  );
});
