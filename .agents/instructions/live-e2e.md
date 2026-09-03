# Live E2E

Read this guide before changing real-LLM Playwright tests, credential setup, live
CI triggers, live artifacts, or PR media.

## Boundary and runner

Live tests exist only under `tests/e2e/live/` and run only through the live runner
and `playwright.live.config.ts`. Ordinary Playwright runs exclude this directory.
The runner loads optional local environment configuration, validates prerequisites
without printing secrets, supports a check-only mode, and forwards Playwright
arguments.

The config starts the real local Agent Server/UI stack, not MSW. It defaults to
dedicated live-test ports and creates a per-run session key unless explicitly
configured. Specs that call the backend inject `X-Session-API-Key` only for the
configured backend origin; never use global Playwright headers.

## Conversation contract

Live helpers under `tests/e2e/live/utils/` configure the running Agent Server with
LLM credentials and low-risk conversation settings. Keep credentials out of
errors, screenshots, videos, traces, and logs.

The primary smoke flow remains cheap and deterministic while exercising one real
tool call: request the exact expected shell command, observe its output outside
the user message, confirm the successful terminal observation through Agent
Server events, then observe the final reply token. A single CI retry accounts for
model variance; prompts avoid unnecessary formatting obedience.

## Analytics and artifacts

Live runs set `VITE_DO_NOT_TRACK=1`, seed analytics opt-out before app startup, and
install the PostHog network guard before navigation. Any attempted PostHog request
fails the test.

Trace capture remains disabled because settings requests contain credentials.
Capture only safe app regions and apply the shared artifact mask. CI recording is
explicitly enabled; local video defaults to retain-on-failure.

## CI security

Live CI runs only by manual PR dispatch or the designated label on a same-repo PR.
Skip forks before checkout so untrusted code cannot access LLM or artifact-push
credentials. Keep secrets out of job-level environment and inject the LLM key only
into the trusted test step.

The job uploads the HTML report and safe media. Reporting scripts under
`tests/e2e/live/scripts/` extract attachments, render the report, and upsert the PR
comment. Inline GIF/PNG media is stored under the PR branch's run-specific
`.pr/live-e2e/` path; the full WebM remains linked. `.github/workflows/pr-artifacts.yml`
owns approval-time cleanup. AI agents never edit the human-authored `HUMAN:` PR
description section to satisfy validation.

## Completion

Framework changes update this guide in the same PR. Verify opt-in triggering,
fork isolation before checkout, step-scoped secrets, origin-scoped auth, analytics
blocking, trace disablement, redacted media, and artifact cleanup.
