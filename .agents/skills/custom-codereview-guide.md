---
name: custom-codereview-guide
description: Repository-specific review rules for the OpenHands Agent Canvas frontend.
triggers:
  - /codereview
---

# OpenHands Agent Canvas Code Review Guidelines

This guide supplements the public `code-review` skill with rules specific to
Agent Canvas. Read root `AGENTS.md`, then every linked guide matching the diff.

Be direct and constructive. Review correctness and architecture, not formatting
that lint or the compiler already checks.

## Review Decision

- Submit exactly one review: **APPROVE** or **COMMENT**. Never use
  **REQUEST_CHANGES**.
- Default to **APPROVE** when there are no important findings. Nitpicks and
  optional cleanup are not reasons to withhold approval.
- Use **COMMENT** for correctness, security, architecture, missing evidence, or
  unmet acceptance criteria. Let a human maintainer make the blocking decision.
- Do not approve changes that can affect agent or benchmark behavior—prompts,
  tool selection, conversation payloads, terminal behavior, planning, memory,
  or evaluation paths—without human review and appropriate lightweight evals.
- Read the linked issue and include a compact checklist covering each acceptance
  criterion. Meeting the checklist is necessary but does not replace review for
  regressions, security, or maintainability.

## Repository Ownership

Apply [API and repository boundaries](../instructions/api.md). Flag raw endpoint
reimplementations, Canvas-local wire contracts, and changes in the wrong repo.

## Architecture That Guides Agents

Agents tend to copy the nearest pattern and choose the shortest compiling path.
Review the codebase as part of the product surface that guides those choices:

1. **Make the conventional path cheapest.** New work should naturally reuse a
   named hook, service, store, or feature module instead of adding another branch
   to a shared root.
2. **Fail forbidden dependencies mechanically.** Repeated review guidance should
   become a lint rule, compiler boundary, or architecture test. Do not grow this
   document when a small executable guard would be clearer.
3. **Give durable state one obvious writer.** A backend setting, consent value,
   conversation cache entry, or persisted browser value should have one named
   owner. Flag second writers and component-local mirrors of authoritative state.
4. **Prefer owned feature files over shared switches.** Product work should
   usually extend a feature-owned module. Shared registries and root conditionals
   need a concrete reason.
5. **Keep exceptions narrow and visible.** Exceptions belong in a small allowlist
   next to the guard that enforces the rule and should be reviewed as architecture
   changes.

Treat “deep module” as a design heuristic, not a line-count target. A good module
has a narrow, stable interface and hides cohesive complexity. Do not split a file
merely because it is long, and do not create layers that only rename or forward
arguments. Prefer a small pure seam when it removes duplicated decisions, makes
ownership explicit, or enables focused tests.

### React effects

`useEffect` is for synchronizing React with an external system. Flag effects used
to:

- derive render data from props or state;
- respond to a user action that can run in the event handler;
- initialize a value that belongs in a lazy state initializer;
- mirror one store or cache into another component state value; or
- repair ordering created by competing writers.

An effect is not automatically wrong. Subscription, browser API, timer, and
network synchronization still belong in effects when cleanup and dependency
semantics are explicit.

## Blocking Architecture Checkpoints

### Agent Server and Cloud API access

Apply the API guide. Review typed-client guard allow-list changes as architecture
changes.

### Event wire contracts

Apply the API guide. Reject Canvas-local redeclarations, module augmentation, and
presentation fields added to wire-event interfaces.

### Telemetry and durable frontend state

Apply [telemetry](../instructions/telemetry.md) to analytics changes and
[frontend conventions](../instructions/frontend.md) to durable state changes.

## Dependencies and Releases

- Direct dependencies are exact-pinned. Keep `package.json` and
  `package-lock.json` synchronized through npm; do not hand-edit one side only.
- Treat changes to dependency exemptions, git pins, and security overrides as
  reviewable policy changes. `__tests__/package-library.test.ts` is the executable
  source of truth for allowed specs.
- Scrutinize newly published third-party dependency versions for supply-chain
  risk. First-party OpenHands packages are exempt from a waiting period but not
  from contract and release-order review.
- Package version changes belong in explicit release PRs and must match the
  release workflow expectations.

## Testing and Evidence

- Require evidence proportional to the behavior changed. For UI behavior, use a
  screenshot or video from the real app. For CLI, API, or scripts, require the
  exact runtime command and observed result. Unit tests alone are not end-to-end
  evidence.
- Prefer tests that exercise real logic and observable state. Do not reward mocks
  that only prove another mock was called.
- Keep tests focused: one meaningful assertion path per behavior, no duplicated
  coverage of library behavior, and no brittle presentation-only snapshots.
- Follow [testing](../instructions/testing.md) and its E2E routing. If a change crosses a full-stack flow
  and lacks suitable coverage, recommend mock-LLM E2E and add the `e2e-tests`
  label when appropriate.
- Never broaden live E2E triggers or secret exposure for convenience.

## What Not to Comment On

Do not leave review comments for:

- formatting or minor style that tooling handles;
- optional “nice to have” refactors unrelated to the change;
- praise-only observations—approve instead;
- extra tests for straightforward data/config changes when existing checks cover
  the risk; or
- temporary `.pr/` artifacts, which are cleaned up by repository automation.

When raising a finding, trace the relevant call or data flow far enough to show
the concrete failure mode. Prefer one high-signal comment over several symptoms
of the same ownership problem.

## Communication Style

- Be concise, specific, and friendly.
- Explain the user-visible or architectural consequence.
- Suggest the smallest viable correction.
- Use GitHub suggestion syntax for local fixes.
- If the PR is sound, approve it without manufacturing feedback.
