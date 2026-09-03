# API and repository boundaries

Read this guide before changing frontend services, backend selection, settings,
events, secrets, skills, git integration, Agent Server calls, or Cloud calls.

## Ownership

Canvas consumes existing APIs. Put canonical server behavior and new endpoints
in `OpenHands/software-agent-sdk`, browser client access and wire types in
`OpenHands/typescript-client`, reusable skills/integrations in
`OpenHands/extensions`, and scheduling/webhook lifecycle behavior in
`OpenHands/automation`.

Normal dependency direction:

`software-agent-sdk` → OpenAPI contract → `typescript-client` → Canvas.

## Agent Server access

Use `@openhands/typescript-client` for every Agent Server REST, workspace, event,
VS Code, `/server_info`, and socket call. Construct clients with helpers from
`src/api/agent-server-client-options.ts`; application code does not construct the
low-level HTTP client or duplicate endpoint types.

`src/api/no-direct-agent-server-calls.test.ts` is the executable authority for
forbidden direct calls and narrow infrastructure exceptions. Treat allow-list
changes as architecture changes.

The default working-directory fallback is `DEFAULT_WORKING_DIR` from
`src/api/agent-server-config.ts`. Reuse it for git heuristics and PLAN previews.

## Cloud access

Route browser requests to OpenHands Cloud and Cloud runtime sandboxes through
`callCloudProxy()` in `src/api/cloud/proxy.ts`. Runtime requests supply the
conversation host as `hostOverride`, use `authMode: "session-api-key"`, and pass
the runtime session key. Cloud API calls use the Cloud backend and bearer mode.

Keep Cloud behavior explicit in the backend registry and `src/api/cloud/`; do not
restore removed hosted routes without their complete API and i18n dependencies.

## Wire contracts and compatibility

The SDK event model is authoritative; the TypeScript client mirrors it; Canvas
consumes the published client type. Canvas presentation fields belong in a
separate view model keyed by event identity. Contract changes land SDK first,
then TypeScript client release, then Canvas.

Use `/server_info.usable_tools` for capability gating. Missing capability
metadata preserves compatibility by allowing the existing tool set. Enforce the
minimum Agent Server version through `src/api/agent-server-compatibility.ts` and
`config/defaults.json`.

## Settings and secrets

- `settings-service` reads schemas from the Agent Server, fetches settings with
  encrypted-secret exposure only for conversation-start payloads, and persists
  PATCH diffs.
- Frontend preferences persist under
  `misc_settings.app_preferences`; partial `misc_settings_diff` values deep-merge,
  while list values replace the list. Do not add a localStorage fallback.
- Git provider tokens and custom secrets live only in Agent Server settings.
  Conversation creation explicitly converts stored custom secrets to authenticated
  `LookupSecret` entries; the server does not attach them automatically.
- Agent delegation persists through `agent_settings_diff`; conversation creation
  attaches `task_tool_set` only when `enable_sub_agents` is true.

## Backends, skills, and conversation lifecycle

- The initial default local backend becomes an ordinary registered backend.
  `getEffectiveLocalBackend()` may synthesize a local fallback for API clients;
  UI lists use the registered list.
- A paused Cloud sandbox keeps its old `conversation_url`. Suppress WebSocket
  connection while paused and fast-poll until the sandbox returns to running.
- Public skills come from `@openhands/extensions`; fetch only user/project skills
  from Agent Server with `load_public: false`. Keep enablement policy centralized
  in `src/utils/skill-enablement.ts`.

## Completion

Before finishing, account for every changed call against the ownership boundary,
typed-client guard, authentication mode, wire authority, and persistence owner.
