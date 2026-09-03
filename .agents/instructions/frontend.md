# Frontend conventions

Read this guide before changing React UI, state, navigation, i18n, shared
identifiers, conversation rendering, onboarding, MCP UI, or library embedding.

## State and module boundaries

- Give durable state one named writer. Reuse the owning service, store, or hook;
  render from its authoritative value rather than mirroring it locally.
- Use effects to synchronize with external systems, with explicit cleanup and
  dependencies. Derive render data during render; handle user actions in their
  event handlers; use lazy state initialization for one-time initial values.
- Prefer a narrow feature-owned module over another conditional in a shared root.
  A useful extraction hides cohesive complexity behind a small stable interface.
- Components under `src/components/` receive navigation through
  `src/context/navigation-context.tsx`; use `NavigationLink` for links. Router
  integration stays under `src/routes/`.

## Strings

User-visible copy, accessibility labels, placeholders, titles, alt text, and toast
messages use `react-i18next` with an `I18nKey`. Declare translations in
`src/i18n/translation.json`, run the repository generators, and verify translation
completeness. Generated declarations and locale bundles are not hand-edited.

Program-readable shared strings—storage keys, event names, query keys, routes,
headers, env names, paths, and flags—use one named constant owned by the closest
module. Reuse query-key helpers from `src/hooks/query/query-keys.ts`.

Discriminated tags use string-literal unions instead of unconstrained `string`.
Test fixtures and non-localizable glyphs are narrow exceptions; keep lint disables
on the affected line.

## Embedding and styling

- Preserve the `[data-agent-server-ui]` CSS boundary and selector transformation
  in `src/styles/agent-server-ui-style-scope.ts`. Map global selectors onto the
  scoped shell, not impossible descendants.
- Embedded consumers use `AgentServerUIProviders` or `AgentServerUIRoot`.
  Standalone startup avoids a duplicate style root. Keep public scoping APIs
  exported through `src/lib/index.ts`.
- Library i18n stays in the `openhands` namespace. Keep the translation JSON out
  of eager app chunks and preserve public i18n exports.
- Internal app code uses deep imports instead of public library barrels when the
  barrel would enlarge the eager Vite graph. Lazy UI tests wait for mounted nodes.

## Feature invariants

- Conversation history is REST-first, newest-page first, reversed into
  chronological order, then continued by WebSocket using the latest loaded
  timestamp. Older pages merge through bulk event insertion with deduplication.
- Chat pagination guards concurrent entry paths synchronously; a full page can
  imply more history for older servers even without `next_page_id`.
- Event grouping preserves original event rendering when expanded, hoists each
  action thought once, and excludes standalone thinking, finishing, task, hook,
  error, and message events from ordinary action groups.
- An attached source means an explicitly selected repository or persisted local
  workspace—not merely a git worktree. Empty/unborn repositories suppress diff
  view. Deleted files render a placeholder instead of requesting an unsupported
  server diff.
- Onboarding navigation uses logical phases because the backend phase is optional.
  Cloud readiness may suppress onboarding; local readiness may not.
- Local settings are profile-oriented; Cloud settings edit raw settings. Keep the
  distinction visible in headings and links.
- MCP stays a top-level route. Marketplace data comes from
  `@openhands/extensions`; installed custom servers must render without catalog
  metadata. Runtime transport patches are immutable, ID-specific, and
  environment-gated.
- `DEFAULT_SETTINGS.llm_model` in `src/services/settings.ts` is the frontend LLM
  default. Conversation creation sends it explicitly when the resolved model is
  blank; update `specs/llm-defaults.md` with changes.

## Dependencies and component behavior

Stay on the repository's configured HeroUI major until a dedicated migration
includes visual validation. Preserve the existing Tailwind integration and API
shape while on that major.

Dropdown/popover actions that open a modal keep the parent mounted through mouse
down, then open on click. Inline popovers support Escape unless a child modal owns
the interaction.

## Completion

Before finishing, identify the single state owner, localize every visible string,
reuse named identifiers, preserve applicable feature invariants, and cover the
observable behavior according to the testing guide.
