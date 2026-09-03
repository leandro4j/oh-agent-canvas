# Agent Canvas instructions

Agent Canvas is the React/TypeScript frontend. It owns UI, frontend state,
backend selection, consumption of existing backend APIs, and local-stack
orchestration.

Repository ownership:

- Agent Server behavior, tools, conversations, and endpoints belong in
  `OpenHands/software-agent-sdk`.
- Browser-compatible Agent Server clients and wire types belong in
  `OpenHands/typescript-client`.
- Public skills and integrations belong in `OpenHands/extensions`.
- Scheduling, webhooks, run history, and dispatch belong in
  `OpenHands/automation`.

## Required context

Before acting, read every guide whose trigger matches the task. Apply all
matching guides; load no unrelated guide.

- **Agent Server, Cloud, settings, events, git, skills, secrets, backend registry,
  or service calls:** [API and repository boundaries](.agents/instructions/api.md)
- **React UI, frontend state, navigation, i18n, shared identifiers, conversation
  rendering, onboarding, MCP UI, or embedded library:**
  [Frontend conventions](.agents/instructions/frontend.md)
- **Analytics, consent, PostHog, identity, funnel headers, or tracked events:**
  [Telemetry](.agents/instructions/telemetry.md)
- **Behavior changes, unit/component tests, MSW, fixtures, specs, or verification:**
  [Testing](.agents/instructions/testing.md)
- **Mock-LLM Playwright, production-path E2E, affected-test routing, or E2E
  artifacts:** [Mock-LLM E2E](.agents/instructions/mock-llm-e2e.md)
- **Real-LLM Playwright, live credentials, live media, or live CI triggers:**
  [Live E2E](.agents/instructions/live-e2e.md)
- **Dev launchers, ingress, authentication, runtime service metadata, local stack,
  Vite, or Vercel:** [Runtime stack](.agents/instructions/runtime-stack.md)
- **Dependencies, npm library/binary, Docker, Electron, release workflows, PR
  automation, or PR artifacts:**
  [Distribution and release](.agents/instructions/distribution.md)
- **Code review:**
  [Repository review guide](.agents/skills/custom-codereview-guide.md)
- **Cutting or publishing a release:** [Release process](.agents/skills/release.md)

### Domain docs

Use the single-context domain layout: root `CONTEXT.md` and `docs/adr/`.

## Sources of truth

Prefer source, tests, `package.json` scripts, and `config/defaults.json` over
copied inventories. Put durable rationale in an ADR or beside the owning code and
regression test; keep change history out of agent instructions.
