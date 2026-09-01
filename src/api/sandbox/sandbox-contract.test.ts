import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import AgentServerRuntimeService from "../runtime-service/agent-server-runtime-service";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "../backend-registry/active-store";
import type { Backend } from "../backend-registry/types";
import {
  batchGetSandboxConversations,
  pauseSandbox,
} from "./sandbox-conversation-service.api";
import { server } from "#/mocks/node";

const sandboxBackend: Backend = {
  id: "sandbox",
  name: "Sandbox",
  host: "https://sandbox.example.test",
  apiKey: "control-plane-key",
  kind: "sandbox",
};

const runtimeUrl =
  "https://runtime.example.test/api/conversations/conversation-1";

describe("Sandbox network contracts", () => {
  beforeEach(() => {
    __resetActiveStoreForTests();
    setRegisteredBackends([sandboxBackend]);
    setActiveSelection({ backendId: sandboxBackend.id });
  });

  afterEach(() => {
    setActiveSelection(null);
    setRegisteredBackends([]);
    __resetActiveStoreForTests();
  });

  it("forwards the control-plane key and preserves lifecycle errors", async () => {
    let receivedApiKey: string | null = null;
    server.use(
      http.post(
        "https://sandbox.example.test/api/v1/sandboxes/sandbox-1/pause",
        ({ request }) => {
          receivedApiKey = request.headers.get("X-Session-API-Key");
          return HttpResponse.json(
            { detail: "sandbox is already paused" },
            { status: 409 },
          );
        },
      ),
    );

    await expect(pauseSandbox("sandbox-1")).rejects.toMatchObject({
      status: 409,
    });
    expect(receivedApiKey).toBe("control-plane-key");
  });

  it("clears stale runtime credentials returned for a paused conversation", async () => {
    server.use(
      http.get(
        "https://sandbox.example.test/api/v1/app-conversations",
        ({ request }) => {
          expect(new URL(request.url).searchParams.getAll("ids")).toEqual([
            "conversation-1",
          ]);
          return HttpResponse.json([
            {
              id: "conversation-1",
              sandbox_id: "sandbox-1",
              sandbox_status: "PAUSED",
              conversation_url: runtimeUrl,
              session_api_key: "stale-runtime-key",
            },
          ]);
        },
      ),
    );

    await expect(
      batchGetSandboxConversations(["conversation-1"]),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "conversation-1",
        conversation_url: null,
        session_api_key: null,
      }),
    ]);
  });

  it("sends runtime auth directly and surfaces invalid runtime authentication", async () => {
    let receivedApiKey: string | null = null;
    server.use(
      http.get(
        "https://runtime.example.test/api/file/download",
        ({ request }) => {
          receivedApiKey = request.headers.get("X-Session-API-Key");
          return new HttpResponse(null, {
            status: 401,
            statusText: "Unauthorized",
          });
        },
      ),
    );

    await expect(
      AgentServerRuntimeService.downloadFile(
        runtimeUrl,
        "runtime-key",
        "/workspace/project/README.md",
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(receivedApiKey).toBe("runtime-key");
  });
});
