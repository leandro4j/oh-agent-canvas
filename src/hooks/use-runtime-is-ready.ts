import { useSyncExternalStore } from "react";
import { useAgentState } from "#/hooks/use-agent-state";
import {
  RUNTIME_INACTIVE_STATES,
  RUNTIME_STARTING_STATES,
} from "#/types/agent-state";
import {
  getSnapshot,
  subscribeActiveBackend,
} from "#/api/backend-registry/active-store";
import { useActiveConversation } from "./query/use-active-conversation";
import { isExecutionActive } from "#/utils/status";
import { usesControlPlane } from "#/api/backend-registry/capabilities";

interface UseRuntimeIsReadyOptions {
  allowAgentError?: boolean;
}

export const useRuntimeIsReady = ({
  allowAgentError = false,
}: UseRuntimeIsReadyOptions = {}): boolean => {
  const { data: conversation } = useActiveConversation();
  const { curAgentState } = useAgentState();
  const snapshot = useSyncExternalStore(
    subscribeActiveBackend,
    getSnapshot,
    getSnapshot,
  );
  const inactiveStates = allowAgentError
    ? RUNTIME_STARTING_STATES
    : RUNTIME_INACTIVE_STATES;
  const usesManagedRuntime =
    usesControlPlane(snapshot.active.backend) ||
    conversation?.sandbox_status != null;
  const hasRuntime =
    !usesManagedRuntime ||
    (conversation?.sandbox_status === "RUNNING" &&
      !!conversation.conversation_url?.trim() &&
      !!conversation.session_api_key?.trim());

  return (
    hasRuntime &&
    isExecutionActive(conversation?.execution_status) &&
    !inactiveStates.includes(curAgentState)
  );
};
