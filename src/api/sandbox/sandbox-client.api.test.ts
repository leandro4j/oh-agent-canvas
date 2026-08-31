import { AgentServerClient } from "@openhands/typescript-client/clients";
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

vi.mock("@openhands/typescript-client/clients", () => ({
  AgentServerClient: vi.fn(),
}));

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const remove = vi.fn();
const close = vi.fn();

const sandboxBackend: Backend = {
  id: "sandbox",
  name: "Sandbox",
  host: "https://sandbox.example.test/",
  apiKey: "control-plane-key",
  kind: "sandbox",
};

beforeEach(() => {
  vi.clearAllMocks();
  __resetActiveStoreForTests();
  setRegisteredBackends([sandboxBackend]);
  setActiveSelection({ backendId: sandboxBackend.id });
  vi.mocked(AgentServerClient).mockImplementation(
    function MockAgentServerClient() {
      return {
        get,
        post,
        patch,
        delete: remove,
        close,
      } as unknown as AgentServerClient;
    } as unknown as typeof AgentServerClient,
  );
});

afterEach(() => {
  setActiveSelection(null);
  setRegisteredBackends([]);
  __resetActiveStoreForTests();
});

describe("Sandbox control-plane client", () => {
  it("targets the v1 control plane with the backend key", () => {
    createSandboxControlPlaneClient(sandboxBackend);

    expect(AgentServerClient).toHaveBeenCalledWith({
      host: "https://sandbox.example.test/api/v1",
      apiKey: "control-plane-key",
      timeout: 300000,
    });
  });

  it("closes the typed client even when a lifecycle request fails", async () => {
    const error = Object.assign(new Error("conflict"), { status: 409 });
    get.mockRejectedValue(error);

    await expect(
      withSandboxControlPlaneClient((client) =>
        client.get("/app-conversations/search"),
      ),
    ).rejects.toBe(error);

    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects a non-Sandbox backend before constructing a client", () => {
    expect(() =>
      createSandboxControlPlaneClient({
        ...sandboxBackend,
        kind: "local",
      }),
    ).toThrow("Sandbox control-plane calls require a sandbox backend.");
    expect(AgentServerClient).not.toHaveBeenCalled();
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
