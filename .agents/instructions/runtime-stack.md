# Runtime stack

Read this guide before changing dev launchers, ingress, authentication, runtime
service metadata, Vite startup, or Vercel deployment.

## Sources and modes

`config/defaults.json` owns version pins, ports, persistence paths, package names,
compatibility floor, and shared defaults. Consumers derive values from it; change
the JSON rather than synchronized copies. `package.json` owns current launcher
commands and mode names.

The full host stack comprises Agent Server, automation backend, frontend server,
and ingress. The minimal launcher omits automation. Static mode serves the built
frontend instead of Vite. Ingress routes automation, Agent Server/socket, and
frontend traffic behind one origin.

Keep coordinated `SIGINT`, `SIGTERM`, and `SIGHUP` shutdown. POSIX children run in
detached process groups, so cleanup signals the process tree. Launcher spawn
failures surface immediately.

## Runtime service metadata

Launchers build runtime metadata through `scripts/runtime-services-info.mjs` and
the automation wrapper. Ingress/static-server append it to the real Agent Server
`/server_info` response; the backend remains authoritative for compatibility and
tool fields.

The frontend reads `runtime_services`, renders a `<RUNTIME_SERVICES>` suffix, and
attaches it to `AgentContext.system_message_suffix` when creating conversations.
URLs describe the agent's point of view. Treat advertised service keys as
optional; omit unavailable services.

Agents trust this block instead of probing or guessing. The listed Agent Server is
the environment executing tools, not the automation backend. Automation requests
use its advertised `url_from_agent`, API prefix, and named session-key header.

## Authentication

Local mode generates and persists session and encryption keys, passes the session
key to Agent Server and automation, and provides it to the frontend through Vite
configuration or static HTML injection. The injected window value is the
load-bearing fallback for a freshly installed binary; synchronize the seeded
default backend when launch keys rotate.

Public mode requires an operator-supplied local backend key and does not embed it
in frontend assets. A `/server_info` authentication failure opens the API-key
entry flow for local persistence. Preserve this separation across dev and
published-binary launchers.

## Agent Server and automation launch

The Agent Server launcher supports, in precedence order, a local SDK checkout, a
git ref, then the configured released version. It uses `uvx` without requiring a
permanent tool install. Settings encryption uses the persisted secret-key path
shared with Docker unless explicitly overridden.

Keep automation and Agent Server SDK versions synchronized through the existing
check. Both services share the stack session key; the browser receives no separate
automation credential.

`tools/canvas_ui_tool.py` is imported during Agent Server startup. It currently
registers both the legacy Canvas UI tool and the SDK finish tool required by
remote automation conversations; remove the compatibility registration only when
the SDK self-registers that builtin.

## Frontend serving

Static-server runtime injection supplies the published binary's session key before
application bootstrap. Mock static builds start MSW when their build flag is set.

Keep core React client-entry dependencies in Vite's optimization include list to
avoid first-load stale optimization failures. On Vercel, preserve `build/client`
and the React Router Vercel preset; flattening the client output produces an empty
deployment.

README setup remains chronological from clone to a real Agent Server. Changes to
install or Docker-sandbox instructions update both `README.md` and the PowerShell
guide `README.windows.md`.

## Completion

Before finishing, trace configuration from its single source through launcher,
proxy, frontend injection, and conversation context; verify auth never crosses its
mode boundary and process cleanup reaches every child.
