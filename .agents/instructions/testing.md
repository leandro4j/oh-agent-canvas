# Testing

Read this guide before changing behavior, tests, MSW handlers, fixtures, specs, or
verification workflows. Also read the matching E2E guide when applicable.

## Behavioral changes

Work test-first. Start with a focused failing test that observes user-visible or
public behavior, then make it pass and refactor. Use Arrange–Act–Assert, one
meaningful behavior path per test, and the minimum cases needed for full coverage.

Extend a suitable existing test file before creating another. Mock the underlying
service rather than its hook. Prefer real logic and observable state over tests
that only prove a mock was called. Functional CSS contracts may be asserted;
presentation-only snapshots and duplicated assertions are brittle.

## Test selection

- Unit/component/API-adapter behavior: Vitest under `__tests__/`.
- Browser behavior with a real Agent Server and scripted model: mock-LLM E2E.
- Credentialed model behavior: live E2E, only when the real model path is the
  subject.
- Ordinary mocked Playwright tests stay outside `tests/e2e/live/`.

Inspect `package.json` for current commands. Run the narrowest relevant test
while iterating, then the repository checks proportional to risk. UI behavior
needs real-app screenshot/video evidence when preparing a PR; CLI/API/script
behavior needs the exact command and observed result.

## MSW and generated assets

Mock-mode handlers model the adapted Agent Server routes used by the frontend,
including bootstrap, settings, secrets, conversations, events, and git. Add a
handler when application code adds a dependency on a route.

Handler-imported bundles and JSON live under `src/fixtures/` and use the `#` source
alias; Docker excludes test directories. Static mock verification uses the mock
build path so MSW starts in production/static mode.

Run i18n generation before typechecking when declarations are absent. Keep DOM
globals guarded in suites that also run under Node.

## Specs

Specs live under `specs/`. IDs are stable: never renumber; mark deprecated specs
with strikethrough. Tag implementation and tests immediately above the relevant
block with `// @spec <ID> — <title>`. Use parameterized tests when identical
structure covers one spec repeatedly.

## Completion

Every changed behavior has one focused regression path, all modified spec IDs are
accounted for, generated inputs exist, and the chosen verification reaches the
actual layer changed.
