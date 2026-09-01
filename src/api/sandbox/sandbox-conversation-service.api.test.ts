import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "../backend-registry/active-store";
import type { Backend } from "../backend-registry/types";
import type { AppConversation } from "../conversation-service/agent-server-conversation-service.types";
import { ExecutionStatus } from "#/types/agent-server/core";
import {
  batchGetSandboxConversations,
  createSandboxConversation,
  deleteSandboxConversation,
  getSandboxConversationStartTask,
  normalizeSandboxConversation,
  pauseSandbox,
  resumeSandbox,
  searchSandboxConversations,
  updateSandboxConversationTitle,
} from "./sandbox-conversation-service.api";

const client = {
  searchConversations: vi.fn(),
  getConversations: vi.fn(),
  createConversation: vi.fn(),
  getConversationStartTask: vi.fn(),
  deleteConversation: vi.fn(),
  pauseSandbox: vi.fn(),
  resumeSandbox: vi.fn(),
  request: vi.fn(),
};

vi.mock("./sandbox-client.api", () => ({
  withSandboxControlPlaneClient: vi.fn(
    (operation: (value: typeof client) => Promise<unknown>) =>
      operation(client),
  ),
}));

const sandboxBackend: Backend = {
  id: "sandbox",
  name: "Sandbox",
  host: "https://sandbox.example.test",
  apiKey: "control-plane-key",
  kind: "sandbox",
};

const conversation: AppConversation = {
  id: "conversation-1",
  created_by_user_id: "user-1",
  selected_repository: null,
  selected_branch: null,
  git_provider: null,
  title: "Sandbox conversation",
  trigger: null,
  pr_number: [],
  agent_kind: "openhands",
  llm_model: "openai/gpt-4o-mini",
  metrics: null,
  created_at: "2026-08-31T00:00:00.000Z",
  updated_at: "2026-08-31T00:00:00.000Z",
  execution_status: ExecutionStatus.IDLE,
  sandbox_status: "RUNNING",
  conversation_url:
    "https://runtime.example.test/api/conversations/conversation-1",
  session_api_key: "runtime-key",
  sandbox_id: "sandbox-1",
  sub_conversation_ids: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  __resetActiveStoreForTests();
  setRegisteredBackends([sandboxBackend]);
  setActiveSelection({ backendId: sandboxBackend.id });
});

afterEach(() => {
  setActiveSelection(null);
  setRegisteredBackends([]);
  __resetActiveStoreForTests();
});

describe("Sandbox conversation lifecycle", () => {
  it("lists conversations through the Sandbox Server control plane", async () => {
    client.searchConversations.mockResolvedValue({
      items: [conversation],
      next_page_id: "next",
    });

    await expect(searchSandboxConversations(20, "page-1")).resolves.toEqual({
      items: [conversation],
      next_page_id: "next",
    });

    expect(client.searchConversations).toHaveBeenCalledWith(20, "page-1");
  });

  it("creates, renames, pauses, resumes, and deletes through control-plane routes", async () => {
    const request = {
      title: "New conversation",
      initial_message: null,
      trigger: "gui" as const,
    };
    const task = { id: "task-1", status: "WORKING", request };
    client.createConversation.mockResolvedValue(task);
    client.request.mockResolvedValue({ ...conversation, title: "Renamed" });

    await expect(createSandboxConversation(request)).resolves.toEqual(task);
    await expect(
      updateSandboxConversationTitle("conversation-1", "Renamed"),
    ).resolves.toEqual({ ...conversation, title: "Renamed" });
    await expect(pauseSandbox("sandbox-1")).resolves.toBeUndefined();
    await expect(resumeSandbox("sandbox-1")).resolves.toBeUndefined();
    await expect(
      deleteSandboxConversation("conversation-1"),
    ).resolves.toBeUndefined();

    expect(client.createConversation).toHaveBeenCalledWith(request);
    expect(client.request).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/api/v1/app-conversations/conversation-1",
      body: { title: "Renamed" },
    });
    expect(client.pauseSandbox).toHaveBeenCalledWith("sandbox-1");
    expect(client.resumeSandbox).toHaveBeenCalledWith("sandbox-1");
    expect(client.deleteConversation).toHaveBeenCalledWith("conversation-1");
  });

  it("looks up one start task using the control-plane batch contract", async () => {
    const task = {
      id: "task-1",
      status: "WORKING",
      request: { title: "New conversation" },
    };
    client.getConversationStartTask.mockResolvedValue(task);

    await expect(getSandboxConversationStartTask("task-1")).resolves.toEqual(
      task,
    );

    expect(client.getConversationStartTask).toHaveBeenCalledWith("task-1");
  });

  it("preserves response order and never reuses runtime credentials for paused data", async () => {
    client.getConversations.mockResolvedValue([
      { ...conversation, sandbox_status: "PAUSED" },
      null,
      { ...conversation, id: "conversation-2" },
    ]);

    await expect(
      batchGetSandboxConversations([
        "conversation-1",
        "missing",
        "conversation-2",
      ]),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "conversation-1",
        conversation_url: null,
        session_api_key: null,
      }),
      null,
      expect.objectContaining({
        id: "conversation-2",
        conversation_url: conversation.conversation_url,
        session_api_key: conversation.session_api_key,
      }),
    ]);

    expect(client.getConversations).toHaveBeenCalledWith([
      "conversation-1",
      "missing",
      "conversation-2",
    ]);
  });

  it("clears an incomplete runtime URL/key pair", () => {
    expect(
      normalizeSandboxConversation({
        ...conversation,
        session_api_key: null,
      }),
    ).toEqual(
      expect.objectContaining({
        conversation_url: null,
        session_api_key: null,
      }),
    );
  });

  it("clears runtime credentials before a sandbox is running", () => {
    expect(
      normalizeSandboxConversation({
        ...conversation,
        sandbox_status: "STARTING",
      }),
    ).toEqual(
      expect.objectContaining({
        conversation_url: null,
        session_api_key: null,
      }),
    );
  });

  it("propagates control-plane lifecycle errors", async () => {
    const error = Object.assign(new Error("sandbox conflict"), {
      status: 409,
    });
    client.pauseSandbox.mockRejectedValue(error);

    await expect(pauseSandbox("sandbox-1")).rejects.toBe(error);
  });
});
