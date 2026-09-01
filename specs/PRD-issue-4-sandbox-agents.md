# PRD: Configure Sandbox agents without Cloud-only services

**Issue:** [#4](https://github.com/leandro4j/oh-agent-canvas/issues/4)  
**Status:** Implemented on `feat/issue-4-sandbox-backend`

## Problem

Canvas must let users configure and run a Sandbox agent through Sandbox
Server's authenticated local control plane, while keeping managed Cloud-only
features out of the Sandbox experience.

## Goals

- Use the Sandbox Server `/api/v1` control plane for settings, model profiles,
  secrets, and skills.
- Preserve the runtime-provided model/provider identity; do not substitute the
  Canvas frozen default model.
- Keep profiles usable without exposing or clearing redacted API keys.
- Prevent unsupported organization, subscription, plugin, Canvas Extension,
  public-sharing, managed-key, analytics, and billing flows from blocking
  Sandbox use.
- Keep backend credentials out of React Query keys and committed artifacts.

## Design

The active backend capability model gates UI and service calls. Sandbox control
plane requests use the typed `AgentServerClient` with the backend session key;
conversation execution continues through the configured direct runtime. Cloud
and local behavior retain their existing routes. Sandbox settings normalize both
nested and flattened server responses, without copying redacted secrets.

## Acceptance mapping

| Issue requirement | Result |
| --- | --- |
| Session-key-authenticated settings/model configuration | Sandbox settings and profile services use the typed `/api/v1` client. |
| Profiles, secrets, and skills usable | Control-plane contract coverage verifies list, save, secret, skill, and config paths. |
| Cloud-only services excluded | Sandbox guards cover agent profiles, subscription auth, plugins, Canvas Extensions, and public sharing. |
| Runtime model/provider inputs | Sandbox settings and onboarding/profile defaults read the active runtime values. |
| No model/control-plane key leakage | No literal credentials added; control keys are client auth only and excluded from query keys. |
| Contract tests | `__tests__/api/sandbox-backend-contract.test.ts` covers routing, preservation, and unsupported calls. |

## Verification

- `npm run typecheck`
- `npm run lint`
- Focused Sandbox/settings/profile/API tests
- `npm test` attempted; the constrained environment timed out on existing
  port-binding and child-process tests (`listen EPERM` / fixed-port failures).
