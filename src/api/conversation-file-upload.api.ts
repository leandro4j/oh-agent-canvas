import { RemoteWorkspace } from "@openhands/typescript-client/workspace/remote-workspace";
import { getAgentServerClientOptions } from "#/api/agent-server-client-options";
import { getActiveBackend } from "#/api/backend-registry/active-store";
import { batchGetCloudConversations } from "#/api/cloud/conversation-service.api";
import { batchGetSandboxConversations } from "#/api/sandbox/sandbox-conversation-service.api";
import type { AppConversation } from "#/api/conversation-service/agent-server-conversation-service.types";
import type { FileUploadSuccessResponse } from "#/api/open-hands.types";
import {
  buildWorkspaceUploadPath,
  getSafeUploadFileName,
  resolveConversationUploadWorkingDir,
} from "#/api/workspace-upload-path";

const FILE_UPLOAD_CONCURRENCY = 5;

export interface ConversationRuntimeContext {
  conversationUrl: string | null;
  sessionApiKey: string | null;
}

/**
 * Resolve the sandbox runtime URL + session key needed for file upload and
 * send-event calls. Cloud conversations only exist on the provisioned runtime,
 * not on the bundled local agent-server.
 */
export async function resolveConversationRuntime(
  conversationId: string,
  currentConversation?: AppConversation | null,
): Promise<ConversationRuntimeContext> {
  const backendKind = getActiveBackend().backend.kind;
  const isManagedRuntime = backendKind === "cloud" || backendKind === "sandbox";

  if (
    currentConversation?.id === conversationId &&
    currentConversation.conversation_url?.trim() &&
    currentConversation.session_api_key?.trim() &&
    (!isManagedRuntime || currentConversation.sandbox_status === "RUNNING")
  ) {
    return {
      conversationUrl: currentConversation.conversation_url.trim(),
      sessionApiKey: currentConversation.session_api_key.trim(),
    };
  }

  if (backendKind === "cloud") {
    const [conversation] = await batchGetCloudConversations([conversationId]);
    return {
      conversationUrl: conversation?.conversation_url?.trim() ?? null,
      sessionApiKey: conversation?.session_api_key?.trim() ?? null,
    };
  }

  if (backendKind === "sandbox") {
    const [conversation] = await batchGetSandboxConversations([conversationId]);
    return {
      conversationUrl: conversation?.conversation_url?.trim() ?? null,
      sessionApiKey: conversation?.session_api_key?.trim() ?? null,
    };
  }

  return { conversationUrl: null, sessionApiKey: null };
}

function requireRuntime(
  runtime: ConversationRuntimeContext,
): ConversationRuntimeContext & {
  conversationUrl: string;
  sessionApiKey: string;
} {
  if (!runtime.conversationUrl || !runtime.sessionApiKey) {
    throw new Error(
      "Conversation sandbox is still starting. Wait for it to finish, then try again.",
    );
  }
  return {
    conversationUrl: runtime.conversationUrl,
    sessionApiKey: runtime.sessionApiKey,
  };
}

/**
 * Upload attachments into the conversation workspace. Local conversations use
 * the active local agent-server; managed Sandbox conversations target the
 * provisioned runtime directly.
 */
export async function uploadFilesToConversation(
  conversationId: string,
  files: File[],
  currentConversation?: AppConversation | null,
): Promise<FileUploadSuccessResponse> {
  const workingDir = await resolveConversationUploadWorkingDir(
    conversationId,
    currentConversation,
  );
  const runtime = await resolveConversationRuntime(
    conversationId,
    currentConversation,
  );
  const backendKind = getActiveBackend().backend.kind;
  const requiresRuntime = backendKind === "cloud" || backendKind === "sandbox";

  // For managed runtimes, only use the freshly resolved pair. The conversation
  // object can still contain a stale URL/key while a Sandbox is pausing or
  // being reprovisioned; falling back to it can authenticate against a dead
  // runtime or, worse, pair a new URL with an old key.
  const sessionApiKey = requiresRuntime
    ? runtime.sessionApiKey
    : currentConversation?.id === conversationId
      ? (currentConversation.session_api_key ?? runtime.sessionApiKey)
      : runtime.sessionApiKey;
  const conversationUrl = requiresRuntime
    ? runtime.conversationUrl
    : currentConversation?.id === conversationId
      ? (currentConversation.conversation_url ?? runtime.conversationUrl)
      : runtime.conversationUrl;

  if (requiresRuntime) {
    const runtimeCredentials = requireRuntime({
      conversationUrl,
      sessionApiKey,
    });
    return uploadFilesToRuntime({
      files,
      workingDir,
      conversationUrl: runtimeCredentials.conversationUrl,
      sessionApiKey: runtimeCredentials.sessionApiKey,
    });
  }

  return uploadFilesToRuntime({
    files,
    workingDir,
    conversationUrl,
    sessionApiKey,
  });
}

async function uploadFilesToRuntime(options: {
  files: File[];
  workingDir: string;
  conversationUrl: string | null;
  sessionApiKey: string | null;
}): Promise<FileUploadSuccessResponse> {
  const { files, workingDir, conversationUrl, sessionApiKey } = options;
  const workspace = new RemoteWorkspace(
    getAgentServerClientOptions({
      conversationUrl,
      sessionApiKey,
      workingDir,
    }),
  );

  const uploadFile = async (file: File) => {
    try {
      const safeName = getSafeUploadFileName(file.name);
      // @spec WUP-001 — Build an absolute upload path that's anchored against
      // the agent-server's home dir (when `workingDir` is relative) instead
      // of the filesystem root. Without this, default conversations whose
      // working_dir is `workspace/project/<hex>` (relative) land at
      // `/workspace/project/<hex>/...` on the agent-server, which on macOS
      // and fresh containers is a read-only mount.
      const uploadPath = await buildWorkspaceUploadPath(file.name, workingDir, {
        conversationUrl,
        sessionApiKey,
      });
      await workspace.fileUpload(file, uploadPath);
      return { uploadedFile: safeName, skippedFile: null };
    } catch (error) {
      return {
        uploadedFile: null,
        skippedFile: {
          name: file.name,
          reason: error instanceof Error ? error.message : "Upload failed",
        },
      };
    }
  };

  const results: Awaited<ReturnType<typeof uploadFile>>[] = [];
  for (let index = 0; index < files.length; index += FILE_UPLOAD_CONCURRENCY) {
    const batch = files.slice(index, index + FILE_UPLOAD_CONCURRENCY);
    results.push(...(await Promise.all(batch.map(uploadFile))));
  }

  return {
    uploaded_files: results.flatMap((result) =>
      result.uploadedFile ? [result.uploadedFile] : [],
    ),
    skipped_files: results.flatMap((result) =>
      result.skippedFile ? [result.skippedFile] : [],
    ),
  };
}
