import { FileClient } from "@openhands/typescript-client/clients";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "../backend-registry/active-store";
import type { Backend } from "../backend-registry/types";
import AgentServerRuntimeService from "./agent-server-runtime-service";

vi.mock("@openhands/typescript-client/clients", () => ({
  FileClient: vi.fn(),
}));

const downloadFile = vi.fn();

const sandboxBackend: Backend = {
  id: "sandbox",
  name: "Sandbox",
  host: "https://sandbox.example.test",
  apiKey: "control-plane-key",
  kind: "sandbox",
};

beforeEach(() => {
  vi.clearAllMocks();
  __resetActiveStoreForTests();
  setRegisteredBackends([sandboxBackend]);
  setActiveSelection({ backendId: sandboxBackend.id });
  vi.mocked(FileClient).mockImplementation(function MockFileClient() {
    return { downloadFile } as unknown as FileClient;
  } as unknown as typeof FileClient);
});

afterEach(() => {
  setActiveSelection(null);
  setRegisteredBackends([]);
  __resetActiveStoreForTests();
});

describe("Sandbox runtime transport", () => {
  it("surfaces invalid runtime authentication without falling back to the control-plane key", async () => {
    const error = Object.assign(new Error("Unauthorized"), { status: 401 });
    downloadFile.mockRejectedValue(error);

    await expect(
      AgentServerRuntimeService.downloadFile(
        "https://runtime.example.test/api/conversations/conversation-1",
        "runtime-key",
        "/workspace/project/README.md",
      ),
    ).rejects.toBe(error);

    expect(FileClient).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "https://runtime.example.test",
        apiKey: "runtime-key",
      }),
    );
  });
});
