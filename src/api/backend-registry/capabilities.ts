import type { BackendKind } from "./types";

export interface BackendCapabilities {
  readonly usesControlPlane: boolean;
  readonly usesManagedCloud: boolean;
  readonly usesDirectRuntime: boolean;
  readonly features: Readonly<Record<BackendFeature, boolean>>;
}

export type BackendFeature =
  | "agentProfiles"
  | "canvasExtensions"
  | "llmProfileDuplication"
  | "llmSubscriptionAuth"
  | "plugins"
  | "telemetry";

const LOCAL_FEATURES = Object.freeze({
  agentProfiles: true,
  canvasExtensions: true,
  llmProfileDuplication: true,
  llmSubscriptionAuth: true,
  plugins: true,
  telemetry: true,
}) satisfies Readonly<Record<BackendFeature, boolean>>;

const CLOUD_FEATURES = Object.freeze({
  agentProfiles: true,
  canvasExtensions: false,
  llmProfileDuplication: true,
  llmSubscriptionAuth: false,
  plugins: false,
  telemetry: true,
}) satisfies Readonly<Record<BackendFeature, boolean>>;

const SANDBOX_FEATURES = Object.freeze({
  agentProfiles: false,
  canvasExtensions: false,
  llmProfileDuplication: false,
  llmSubscriptionAuth: false,
  plugins: false,
  telemetry: true,
}) satisfies Readonly<Record<BackendFeature, boolean>>;

export const BACKEND_CAPABILITIES: Readonly<
  Record<BackendKind, BackendCapabilities>
> = Object.freeze({
  local: Object.freeze({
    usesControlPlane: false,
    usesManagedCloud: false,
    usesDirectRuntime: true,
    features: LOCAL_FEATURES,
  }),
  cloud: Object.freeze({
    usesControlPlane: true,
    usesManagedCloud: true,
    usesDirectRuntime: false,
    features: CLOUD_FEATURES,
  }),
  sandbox: Object.freeze({
    usesControlPlane: true,
    usesManagedCloud: false,
    usesDirectRuntime: true,
    features: SANDBOX_FEATURES,
  }),
});

type BackendKindInput = BackendKind | { readonly kind: BackendKind };

function resolveBackendKind(input: BackendKindInput): BackendKind {
  return typeof input === "string" ? input : input.kind;
}

export function getBackendCapabilities(
  backend: BackendKindInput,
): BackendCapabilities {
  return BACKEND_CAPABILITIES[resolveBackendKind(backend)];
}

export function usesControlPlane(backend: BackendKindInput): boolean {
  return getBackendCapabilities(backend).usesControlPlane;
}

export function usesManagedCloud(backend: BackendKindInput): boolean {
  return getBackendCapabilities(backend).usesManagedCloud;
}

export function usesDirectRuntime(backend: BackendKindInput): boolean {
  return getBackendCapabilities(backend).usesDirectRuntime;
}

export function isLocalBackend(backend: BackendKindInput): boolean {
  const capabilities = getBackendCapabilities(backend);
  return capabilities.usesDirectRuntime && !capabilities.usesControlPlane;
}

export function isCloudBackend(backend: BackendKindInput): boolean {
  return getBackendCapabilities(backend).usesManagedCloud;
}

export function isSandboxBackend(backend: BackendKindInput): boolean {
  const capabilities = getBackendCapabilities(backend);
  return (
    capabilities.usesControlPlane &&
    capabilities.usesDirectRuntime &&
    !capabilities.usesManagedCloud
  );
}

export function supportsBackendFeature(
  backend: BackendKindInput,
  feature: BackendFeature,
): boolean {
  return getBackendCapabilities(backend).features[feature];
}
