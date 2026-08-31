import type { TFunction } from "i18next";
import {
  isCloudBackendApiKeyOrNetworkHealthError,
  isCloudBackendLoggedOutHealthError,
  isInvalidBackendApiKeyHealthError,
  isSandboxServerUnreachableHealthError,
  isMissingBackendApiKeyHealthError,
} from "#/hooks/query/use-backends-health";
import { getBackendCapabilities } from "#/api/backend-registry/capabilities";
import type { BackendKind } from "#/api/backend-registry/types";
import { I18nKey } from "#/i18n/declaration";
import {
  isBackendRequestTimeoutMessage,
  isCorsOrNetworkErrorMessage,
} from "#/utils/user-facing-error";

interface BackendStatusLabelHealth {
  isConnected?: boolean | null;
  lastError?: string | null;
}

export function getBackendStatusLabel(
  t: TFunction<"openhands">,
  backend:
    | {
        kind?: BackendKind;
        apiKey?: string | null;
        authMode?: "api-key" | "cookie";
      }
    | undefined,
  health: BackendStatusLabelHealth | undefined,
): string {
  const lastError = health?.lastError ?? null;
  const isCloud = backend?.kind === "cloud";
  const capabilities = backend
    ? getBackendCapabilities(backend.kind ?? "local")
    : null;
  const requiresApiKey =
    capabilities?.usesControlPlane === true &&
    (!capabilities.usesManagedCloud || backend?.authMode !== "cookie");

  if (requiresApiKey && !backend?.apiKey?.trim()) {
    return t(I18nKey.BACKEND$STATUS_DISCONNECTED_ADD_API_KEY);
  }

  if (isMissingBackendApiKeyHealthError(lastError)) {
    return t(I18nKey.BACKEND$STATUS_DISCONNECTED_ADD_API_KEY);
  }

  if (isInvalidBackendApiKeyHealthError(lastError)) {
    return t(I18nKey.BACKEND$STATUS_DISCONNECTED_CHECK_API_KEY);
  }

  if (isSandboxServerUnreachableHealthError(lastError)) {
    return t(I18nKey.BACKEND$STATUS_DISCONNECTED_CHECK_URL_OR_NETWORK);
  }

  if (isCloudBackendLoggedOutHealthError(lastError)) {
    return t(I18nKey.BACKEND$LOGGED_OUT);
  }

  if (health?.isConnected === true) {
    return t(I18nKey.ONBOARDING$BACKEND_STATUS_CONNECTED);
  }

  if (
    isCloud &&
    health?.isConnected === false &&
    (isCloudBackendApiKeyOrNetworkHealthError(lastError) ||
      isCorsOrNetworkErrorMessage(lastError))
  ) {
    return t(I18nKey.BACKEND$STATUS_DISCONNECTED_CHECK_CLOUD_ACCESS);
  }

  if (
    health?.isConnected === false &&
    isBackendRequestTimeoutMessage(lastError)
  ) {
    return t(I18nKey.BACKEND$STATUS_DISCONNECTED_CHECK_TUNNEL);
  }

  if (health?.isConnected === false && isCorsOrNetworkErrorMessage(lastError)) {
    return t(I18nKey.BACKEND$STATUS_DISCONNECTED_CHECK_URL_OR_NETWORK);
  }

  if (health?.isConnected === false) {
    return t(I18nKey.ONBOARDING$BACKEND_STATUS_DISCONNECTED);
  }

  return t(I18nKey.ONBOARDING$BACKEND_STATUS_CHECKING);
}
