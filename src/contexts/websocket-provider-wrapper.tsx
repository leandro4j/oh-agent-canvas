import React from "react";
import { ConversationWebSocketProvider } from "#/contexts/conversation-websocket-context";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useSubConversations } from "#/hooks/query/use-sub-conversations";

interface WebSocketProviderWrapperProps {
  children: React.ReactNode;
  conversationId: string;
}

export function WebSocketProviderWrapper({
  children,
  conversationId,
}: WebSocketProviderWrapperProps) {
  const { data: conversation } = useActiveConversation();
  const { data: subConversations } = useSubConversations(
    conversation?.sub_conversation_ids ?? [],
  );

  const filteredSubConversations = subConversations?.filter(
    (subConversation) => subConversation !== null,
  );

  // Sandbox Server may retain the last runtime URL while a sandbox is paused
  // (or report it before the runtime is ready). A WebSocket needs the current
  // URL and its matching runtime key as one atomic pair; wait for the next
  // control-plane poll before attempting to reconnect.
  const usesManagedRuntime = conversation?.sandbox_status != null;
  const hasRuntime = usesManagedRuntime
    ? conversation?.sandbox_status === "RUNNING" &&
      !!conversation?.conversation_url &&
      !!conversation?.session_api_key
    : !!conversation?.conversation_url;
  const conversationUrl = !conversation
    ? undefined
    : hasRuntime
      ? conversation.conversation_url
      : null;
  const sessionApiKey = !conversation
    ? undefined
    : hasRuntime
      ? conversation.session_api_key
      : null;

  return (
    <ConversationWebSocketProvider
      conversationId={conversationId}
      conversationUrl={conversationUrl}
      sessionApiKey={sessionApiKey}
      subConversationIds={conversation?.sub_conversation_ids}
      subConversations={filteredSubConversations}
    >
      {children}
    </ConversationWebSocketProvider>
  );
}
