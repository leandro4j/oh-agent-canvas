import { AGENT_CANVAS_CLIENT_SOURCE } from "#/api/client-source";
import type { BackendKind } from "#/api/backend-registry/types";
import { getBackendTelemetryProperties } from "#/services/telemetry-context";
import { trackEvent } from "#/services/telemetry";

export type CloudConnectionSource =
  | "onboarding"
  | "add_backend_modal"
  | "manage_backends_modal"
  | "cloud_auto_connect";

const CLOUD_CONVERSATION_READY_INSERT_ID_PREFIX = `${AGENT_CANVAS_CLIENT_SOURCE}:cloud_conversation_ready`;

function trackCloudFunnelEvent(
  event: string,
  properties: Record<string, unknown>,
): void {
  void trackEvent(event, properties);
}

function cloudLoginBackendContext() {
  return getBackendTelemetryProperties({
    backendKind: "cloud",
    connectionMethod: "cloud_login",
  });
}

function conversationBackendContext(backendKind: BackendKind) {
  return getBackendTelemetryProperties({
    backendKind,
  });
}

export function trackCloudDeviceAuthorizationStarted(
  _host: string,
  source?: CloudConnectionSource,
): void {
  trackCloudFunnelEvent("cloud_device_authorization_started", {
    ...cloudLoginBackendContext(),
    source,
  });
}

export function trackCloudDeviceAuthorizationSucceeded(
  _host: string,
  source?: CloudConnectionSource,
): void {
  trackCloudFunnelEvent("cloud_device_authorization_succeeded", {
    ...cloudLoginBackendContext(),
    source,
  });
}

export function trackCloudConversationReady(
  taskId: string,
  conversationId: string,
  backendKind: BackendKind = "cloud",
): void {
  trackCloudFunnelEvent("cloud_conversation_ready", {
    ...conversationBackendContext(backendKind),
    $insert_id: `${CLOUD_CONVERSATION_READY_INSERT_ID_PREFIX}:${taskId}`,
    task_id: taskId,
    conversation_id: conversationId,
  });
}
