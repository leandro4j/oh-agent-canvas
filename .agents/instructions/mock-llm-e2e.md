# Mock-LLM E2E

Read this guide before changing mock-LLM Playwright specs, launch configuration,
affected-test routing, Docker reuse, reporting, or artifacts.

## Boundary

Tests under `tests/e2e/mock-llm/` exercise browser → production Canvas binary →
static server/ingress → real Agent Server and automation backend → scripted mock
LLM. They use no real LLM credential. `playwright.mock-llm.config.ts` owns the npm
path; `playwright.mock-llm-docker.config.ts` reuses the same specs against the
image.

Use the single ingress origin for browser and backend assertions. Keep state in
the isolated test directories configured by Playwright, never the user's normal
Canvas state. Generate a fresh session key per run and pass the same value through
the stack's server and frontend channels.

## Mock model

`tests/e2e/mock-llm/scripts/mock-llm-server.py` uses the SDK `TestLLM` and exposes
admin operations for reset, trajectory registration/activation, and captured
completion requests. Profile-validation pings return a canned response and do not
consume a trajectory or enter request history.

Shared helpers live in `tests/e2e/mock-llm/utils/`. Specs register and activate
their own trajectory and reset the mock after each test. Skill-activation flows
include the documented padding response for the internal pre-loop model call.

The ACP fixture is the stdio JSON-RPC server under the mock-LLM scripts directory;
keep its protocol limited to the Agent Server behavior the tests exercise.

## Organization and isolation

Feature subdirectories mirror source areas. Runs are serial and each spec owns its
setup. `tests/e2e/mock-llm/test-mapping.json` and
`resolve-affected-tests.mjs` are the authorities for affected-test selection:
mapped changes run their feature plus regressions; cross-cutting/unmapped source
changes run all; irrelevant docs/spec changes skip heavy work; manual dispatch
runs all.

When adding or moving a spec, update mapping so that the new test runs for both
its own file and the source it covers. Keep regression coverage always selected.

## Automation and runtime metadata

Automation specs use the real automation backend through ingress and authenticate
with the stack session key. Agent-issued requests use the advertised
`runtime_services` URLs and API prefix. The runtime-services test verifies the
rendered block reaches the model.

## Docker reuse

Docker tests replace only the Canvas stack launcher. Host networking is native on
Linux; desktop Docker may require the configured agent-facing mock URL. Keep the
test-facing mock admin URL separate from the agent-facing inference URL.

Files that the containerized Agent Server must read use the Playwright-configured
volume mounts. Start every run from a fresh container. Preserve proxy availability
on backend child failure so tests receive diagnostic 502 responses rather than a
disappearing container.

## CI and reports

Mock-LLM workflows avoid PR `paths` filters; lightweight change detection must
still produce a completed required check. Fork PRs do not receive protected image
or artifact credentials. Keep Playwright and workflow timeouts synchronized.

Reporting scripts live beside these tests. The completion marker is emitted before
web-server teardown. PR comments replace older same-job comments, keep details
collapsed, and identify tests from newly added spec files.

For failures, inspect in order: PR summary, uploaded `error-context.md`, screenshot,
then HTML report. The accessibility-tree snapshot usually distinguishes locator,
rendering, view-mode, stale-state, and route-registration failures. Register
browser routes before navigation and pass unrelated methods through.

## Completion

Framework changes update this guide in the same PR. Confirm production-path
fidelity, isolated state/auth, deterministic trajectories, affected-test mapping,
Docker parity when applicable, and useful failure artifacts.
