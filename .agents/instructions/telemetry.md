# Telemetry

Read this guide before changing analytics, consent, PostHog, Cloud identity,
funnel headers, or tracked events.

## Ownership and lifecycle

`src/services/telemetry.ts` solely owns the named `agent-canvas` PostHog client,
including initialization, identity, persistence, configuration, consent, and
capture. React code interacts through the service and never receives or mutates
the SDK client.

`TelemetryProvider` eagerly initializes the service and solely mounts the
`useTelemetry()` lifecycle that emits install/session events. Do not mount that
lifecycle elsewhere or introduce a second PostHog context.

`configureTelemetry(false)` is an embedding host's hard disable.
`setTelemetryConsent` is the only user-consent controller.
`subscribeTelemetryConsent` is the React-facing consent store; rendering hooks use
`useSyncExternalStore` rather than component mirrors.

An explicit first-run browser choice remains pending until Cloud persistence
confirms it; stale backend state cannot overwrite that newer choice. After Cloud
confirmation, backend consent is authoritative and mirrored to the service.

## Identity and attribution

`canvas_install` fires once before consent with the anonymous install ID. After
consent and Cloud authentication, identify with stable Cloud user ID so PostHog
joins anonymous activity. Switching to a local backend clears Cloud event context
without resetting identity. Resolved logout/account change, consent revocation,
or privacy clear owns reset.

Attach Cloud user/org properties only while a Cloud backend is active.
`telemetry.ts` adds immutable client/package attribution in `before_send`.
Repeated business milestones use deterministic `$insert_id` values.

## Event producers

- React app events use typed functions from `src/hooks/use-tracking.ts`; the hook
  adds `current_url` and captures through the service.
- Non-React state machines use typed functions in
  `src/services/cloud-funnel-analytics.ts`.
- Public library consumers use `trackEvent` and `useTelemetry`.
- A business milestone has one canonical capture. Consent is enforced by the
  service, not by producers reading possibly stale settings.

To add an app event: add its typed function and controlled property types to
`useTracking`, return it from the hook, then call that function from the owning
component.

## Cloud funnel

OAuth device authorization and Cloud conversation-start requests include only
the coarse `X-OpenHands-Client: agent_canvas` and client-version headers from
`src/api/client-source.ts`. They never contain codes, keys, content, raw hosts, or
other user data.

The consented funnel uses the typed
`cloud_device_authorization_started`,
`cloud_device_authorization_succeeded`, and `cloud_conversation_ready` events.
React emits canonical `backend_added` through `useTracking`.

## `onboarding_link_clicked`

All onboarding destination clicks reuse one event contract:

- `link_id`: `configure_llm`, `start_conversation`, `schedule_task`,
  `customize_agent`, `connect_mcp`, `join_slack`, or `open_docs`
- `destination_type`: `community`, `integration`, `documentation`, `settings`,
  `conversation`, or `automation`
- `surface`: `landing_checklist` or reserved `onboarding_modal`
- `checklist_item`: required for every landing-checklist emission
- `step_id`: reserved for future modal links
- `is_external`: boolean

Row and preview-action clicks share the destination's `link_id`; preview docs use
`open_docs`. Wizard controls, backend-connect CTAs, shared LLM help links,
recommended automation cards, and expand/visibility toggles retain their existing
canonical events or remain untracked UI state. Tracking uses `onClick`; middle
click is a known limitation.

## Configuration

`config/defaults.json` owns the default telemetry key/host. Build-time override is
`VITE_POSTHOG_API_KEY`; runtime library consumers configure analytics through
providers. Preserve `VITE_DO_NOT_TRACK=1` as the zero-config disable path and keep
release workflows responsible for production-key injection.

## Completion

Before finishing, prove there is one client owner, one consent controller, one
canonical milestone capture, typed controlled properties, and no sensitive event
or header data.
