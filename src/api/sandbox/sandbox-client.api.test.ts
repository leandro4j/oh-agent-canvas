import { CloudClient } from "@openhands/typescript-client/clients";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "../backend-registry/active-store";
import type { Backend } from "../backend-registry/types";
import { getAgentServerClientOptions } from "../agent-server-client-options";
import {
  createSandboxControlPlaneClient,
  withSandboxControlPlaneClient,
} from "./sandbox-client.api";

const sandboxBackend: Backend = {
  id: "sandbox",
  name: "Sandbox",
  host: "https://sandbox.example.test/",
  apiKey: "control-plane-key",
  kind: "sandbox",
};

beforeEach(() => {
  vi.restoreAllMocks();
  __resetActiveStoreForTests();
  setRegisteredBackends([sandboxBackend]);
  setActiveSelection({ backendId: sandboxBackend.id });
});

afterEach(() => {
  setActiveSelection(null);
  setRegisteredBackends([]);
  __resetActiveStoreForTests();
});

describe("Sandbox control-plane client", () => {
  it("targets the control plane and forces session-key auth", async () => {
    const request = vi
      .spyOn(CloudClient.prototype, "request")
      .mockResolvedValue({ ok: true });
    const client = createSandboxControlPlaneClient(sandboxBackend);

    expect(client.host).toBe("https://sandbox.example.test");
    expect(client.controlPlaneSessionApiKey).toBe("control-plane-key");
    await client.request({ method: "GET", path: "/api/v1/sandboxes" });
    expect(request).toHaveBeenCalledWith({
      method: "GET",
      path: "/api/v1/sandboxes",
      authMode: "session-api-key",
      sessionApiKey: "control-plane-key",
    });
  });

  it("closes the typed client even when a lifecycle request fails", async () => {
    const error = Object.assign(new Error("conflict"), { status: 409 });
    vi.spyOn(CloudClient.prototype, "request").mockRejectedValue(error);
    const close = vi.spyOn(CloudClient.prototype, "close");

    await expect(
      withSandboxControlPlaneClient((client) =>
        client.get("/api/v1/app-conversations/search"),
      ),
    ).rejects.toBe(error);

    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects a non-Sandbox backend", () => {
    expect(() =>
      createSandboxControlPlaneClient({
        ...sandboxBackend,
        kind: "local",
      }),
    ).toThrow("Sandbox control-plane calls require a sandbox backend.");
  });

  it("uses the runtime URL and key for direct calls", () => {
    expect(
      getAgentServerClientOptions({
        conversationUrl:
          "https://runtime.example.test/api/conversations/conversation-1",
        sessionApiKey: "runtime-key",
      }),
    ).toEqual(
      expect.objectContaining({
        host: "https://runtime.example.test",
        apiKey: "runtime-key",
      }),
    );
  });

  it("does not reuse the control-plane key when runtime auth is missing", () => {
    expect(() =>
      getAgentServerClientOptions({
        conversationUrl:
          "https://runtime.example.test/api/conversations/conversation-1",
      }),
    ).not.toThrow();
    expect(
      getAgentServerClientOptions({
        conversationUrl:
          "https://runtime.example.test/api/conversations/conversation-1",
      }).apiKey,
    ).toBeUndefined();
  });
});
