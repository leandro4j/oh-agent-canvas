import type { BackendKind } from "./types";

export interface BackendCapabilities {
  readonly usesControlPlane: boolean;
  readonly usesManagedCloud: boolean;
  readonly usesDirectRuntime: boolean;
}

export const BACKEND_CAPABILITIES: Readonly<
  Record<BackendKind, BackendCapabilities>
> = Object.freeze({
  local: Object.freeze({
    usesControlPlane: false,
    usesManagedCloud: false,
    usesDirectRuntime: true,
  }),
  cloud: Object.freeze({
    usesControlPlane: true,
    usesManagedCloud: true,
    usesDirectRuntime: false,
  }),
  sandbox: Object.freeze({
    usesControlPlane: true,
    usesManagedCloud: false,
    usesDirectRuntime: true,
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
