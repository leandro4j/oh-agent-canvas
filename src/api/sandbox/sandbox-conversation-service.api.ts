import type {
  AppConversation,
  AppConversationPage,
  AppConversationStartRequest,
  AppConversationStartTask,
} from "../conversation-service/agent-server-conversation-service.types";
import type {
  EventSearchOptions,
  EventSearchPage,
} from "../event-service/event-service.types";
import type { OpenHandsEvent } from "#/types/agent-server/core";
import { getStoredConversationMetadata } from "../conversation-metadata-store";
import type { Backend } from "../backend-registry/types";
import { withSandboxControlPlaneClient } from "./sandbox-client.api";

function trimToNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Keep repository metadata visible while the Sandbox Server hydrates it.
 * This mirrors the cloud adapter's read behavior for a consistent list UI.
 */
function overlayStoredRepoSelection(
  conversation: AppConversation | null,
): AppConversation | null {
  if (!conversation?.id) return conversation;
  const stored = getStoredConversationMetadata(conversation.id);
  if (!stored) return conversation;

  return {
    ...conversation,
    selected_repository:
      conversation.selected_repository ?? stored.selected_repository ?? null,
    selected_branch:
      conversation.selected_branch ?? stored.selected_branch ?? null,
    git_provider: conversation.git_provider ?? stored.git_provider ?? null,
    selected_workspace:
      conversation.selected_workspace ?? stored.selected_workspace ?? null,
  };
}

/**
 * Normalize the control-plane response before it enters React Query.
 *
 * Sandbox Server may retain the last exposed runtime URL while a sandbox is
 * paused. A URL without a live runtime must never reach an HTTP or WebSocket
 * client, so runtime credentials are treated as an atomic pair and are only
 * exposed while the sandbox is RUNNING.
 */
export function normalizeSandboxConversation(
  conversation: AppConversation,
): AppConversation {
  const sandboxStatus = conversation.sandbox_status ?? null;
  const conversationUrl = trimToNull(conversation.conversation_url);
  const sessionApiKey = trimToNull(conversation.session_api_key);
  const hasLiveRuntime =
    sandboxStatus === "RUNNING" && !!conversationUrl && !!sessionApiKey;

  return overlayStoredRepoSelection({
    ...conversation,
    conversation_url: hasLiveRuntime ? conversationUrl : null,
    session_api_key: hasLiveRuntime ? sessionApiKey : null,
    sandbox_id: trimToNull(conversation.sandbox_id),
  }) as AppConversation;
}

function normalizeConversationPage(data: {
  items?: AppConversation[];
  next_page_id?: string | null;
}): AppConversationPage {
  return {
    items: (data.items ?? []).map(normalizeSandboxConversation),
    next_page_id: data.next_page_id ?? null,
  };
}

export async function searchSandboxConversations(
  limit = 20,
  pageId?: string,
  backend?: Backend,
): Promise<AppConversationPage> {
  const data = await withSandboxControlPlaneClient(
    (client) => client.searchConversations(limit, pageId),
    backend,
  );

  return normalizeConversationPage(
    (data ?? {}) as unknown as {
      items?: AppConversation[];
      next_page_id?: string | null;
    },
  );
}

export async function batchGetSandboxConversations(
  ids: string[],
  backend?: Backend,
): Promise<(AppConversation | null)[]> {
  if (ids.length === 0) return [];

  const data = await withSandboxControlPlaneClient(
    (client) => client.getConversations(ids),
    backend,
  );

  return (data ?? []).map((item) => {
    const conversation = item as unknown as AppConversation | null;
    return conversation ? normalizeSandboxConversation(conversation) : null;
  });
}

export async function createSandboxConversation(
  request: AppConversationStartRequest,
  backend?: Backend,
): Promise<AppConversationStartTask> {
  return withSandboxControlPlaneClient(
    async (client) =>
      (await client.createConversation(
        request,
      )) as unknown as AppConversationStartTask,
    backend,
  );
}

export async function getSandboxConversationStartTask(
  taskId: string,
  backend?: Backend,
): Promise<AppConversationStartTask | null> {
  return withSandboxControlPlaneClient(
    async (client) =>
      (await client.getConversationStartTask(
        taskId,
      )) as unknown as AppConversationStartTask | null,
    backend,
  );
}

export async function updateSandboxConversationTitle(
  conversationId: string,
  title: string,
  backend?: Backend,
): Promise<AppConversation> {
  const data = await withSandboxControlPlaneClient(
    (client) =>
      client.request<AppConversation>({
        method: "PATCH",
        path: `/api/v1/app-conversations/${encodeURIComponent(conversationId)}`,
        body: { title },
      }),
    backend,
  );
  return normalizeSandboxConversation(data);
}

export async function deleteSandboxConversation(
  conversationId: string,
  backend?: Backend,
): Promise<void> {
  await withSandboxControlPlaneClient(
    (client) => client.deleteConversation(conversationId),
    backend,
  );
}

export async function downloadSandboxConversation(
  conversationId: string,
  backend?: Backend,
): Promise<Blob> {
  return withSandboxControlPlaneClient(
    (client) => client.downloadConversation(conversationId),
    backend,
  );
}

export async function pauseSandbox(
  sandboxId: string,
  backend?: Backend,
): Promise<void> {
  await withSandboxControlPlaneClient(
    (client) => client.pauseSandbox(sandboxId),
    backend,
  );
}

export async function resumeSandbox(
  sandboxId: string,
  backend?: Backend,
): Promise<void> {
  await withSandboxControlPlaneClient(
    (client) => client.resumeSandbox(sandboxId),
    backend,
  );
}

/**
 * Read persisted history from the control plane while a runtime is paused.
 * Running conversations still use the returned runtime URL in EventService.
 */
export async function searchSandboxConversationEvents(
  conversationId: string,
  options: EventSearchOptions = {},
  backend?: Backend,
): Promise<EventSearchPage<OpenHandsEvent>> {
  const data = await withSandboxControlPlaneClient(
    (client) =>
      client.request<EventSearchPage<OpenHandsEvent>>({
        method: "GET",
        path: `/api/v1/conversation/${encodeURIComponent(conversationId)}/events/search`,
        params: {
          limit: options.limit ?? 100,
          ...(options.pageId ? { page_id: options.pageId } : {}),
          ...(options.sortOrder ? { sort_order: options.sortOrder } : {}),
          ...(options.timestampGte
            ? { timestamp__gte: options.timestampGte }
            : {}),
          ...(options.timestampLt
            ? { timestamp__lt: options.timestampLt }
            : {}),
        },
      }),
    backend,
  );

  return {
    items: data?.items ?? [],
    next_page_id: data?.next_page_id ?? null,
  };
}

export async function getSandboxConversationEventCount(
  conversationId: string,
  backend?: Backend,
): Promise<number> {
  return withSandboxControlPlaneClient(
    (client) =>
      client.request<number>({
        method: "GET",
        path: `/api/v1/conversation/${encodeURIComponent(conversationId)}/events/count`,
      }),
    backend,
  );
}
