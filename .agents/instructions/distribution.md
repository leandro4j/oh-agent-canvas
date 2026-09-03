# Distribution and release

Read this guide before changing dependencies, npm packaging, the published binary,
Docker, Electron, release workflows, PR automation, or PR artifacts.

## Dependencies

Direct dependencies are exact-pinned. Update `package.json` and `package-lock.json`
together through npm; use the lockfile with `npm ci`. Security overrides stay
narrow and carry the advisory/reason beside the override. Treat exemption, git
pin, and override changes as policy changes; executable package tests own allowed
specs.

First-party client changes release in dependency order before Canvas consumes the
published version. Inspect the configured ESLint/plugin compatibility before major
tooling upgrades rather than overriding peer constraints.

## npm application and library

The package exports the Canvas binary, standalone app, and library subpaths.
`src/index.ts` and `src/lib/index.ts` own public exports; domain barrels stay under
their component domains. Preserve separate app and library build paths and typed
declaration output. Verify public package contents with the repository's package
checks.

The global binary has no build-time session key. Static-server injection provides
the launch-time key to application bootstrap and the legacy storage compatibility
path.

## Docker

The all-in-one image contains the static frontend, Agent Server, automation
backend, and ingress. `config/defaults.json` supplies build defaults; release CI
may pass explicit build arguments. Preserve the unified route topology and secure
key generation in the entrypoint.

Docker publication builds architecture-specific images, then creates manifests.
PRs may select a linked SDK PR image; fork PRs remain outside credentialed image
flows. The HUMAN-authored PR description section is immutable to AI agents.

Mock-LLM Docker specs reuse host specs and their dedicated guide. Any runtime file
needed by containerized tests must be mounted explicitly.

## Electron

Electron waits in two stages: ingress readiness, then a successful/authenticated
Agent Server `/server_info` response. Preserve the long cold-start allowance and
forward useful service-install/boot progress to the loading window without making
the logging callback fatal.

The packaged app strips the accidentally hoisted root dependency tree after pack,
then restores only the runtime dependency closure declared by the builder config.
When a spawned packaged script gains a bare npm import, add its package to that
runtime set and verify from outside the repository tree so local `node_modules`
cannot hide omissions.

Packaged desktop apps bundle a real Node distribution and prepend its executable
directory to child-process `PATH`; Electron-as-Node wrappers are incompatible with
stdio MCP behavior. Preserve the post-pack Windows npm restoration and hard check,
because builder filtering omits a root `node_modules` directory.

Development branding keeps Electron's application name, bundle display/name, app
directory name, and `path.txt` aligned. Packaged branding follows builder output.

## Release and PR automation

Releases are trunk-based and owned by release-please. Follow
`../skills/release.md` for the operational sequence and human confirmation gate.
Do not manually modify the release PR branch.

The `HUMAN:` PR-description section belongs only to humans. AI agents never add,
edit, move, or remove it. If validation reports it missing or empty, ask the human
to write it; if already populated, report the validator error exactly.

PR-only live media stays under `.pr/` and is removed by the cleanup workflow after
approval. Do not treat temporary PR artifacts as source defects during review.

## Completion

Before finishing, verify dependency lockstep, public package contents, architecture
and platform parity, credential boundaries, and that release/PR ownership remains
with its designated automation or human.
