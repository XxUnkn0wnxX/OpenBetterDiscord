# Open BetterDiscord Fork Notes

## Branch And Remote Model

- Work on `develop`, which absorbs reviewed `upstream/development` changes and
  pushes to fork remote `origin`. Use another branch only at the user's request;
  do not do feature work on temporary upstream-sync branches.

## Local Fork Rules

- Keep fork behavior and fork-specific compatibility fixes intact unless the user explicitly approves changing them.
- Preserve fork branding during upstream adaptations: fork-facing UI, generated
  recovery/debug report text and documentation use `Open BetterDiscord`, with
  `OBD` for presentation abbreviations. Keep the README title
  `Open BetterDiscord macOS fork` and repository identity `OpenBetterDiscord`.
  Do not restore upstream display names or replace fork-owned artwork
  when taking upstream hunks. Keep stable
  API/type/global/path/protocol/ASAR identifiers and actual upstream attribution
  literal; branding is not an API or installed-data migration.
- Preserve `local-build.zsh`, `local-inject.zsh`, and `local-uninject.zsh`.
- Treat `.tmp/` as local-only scratch; never commit it unless explicitly asked.
- `.gitignore` excludes `.tmp/`, `mergedocs/`, and `.venv/` as local-only files.
- `AGENTS.md` is tracked project guidance. Keep personal information, credentials,
  literal personal home paths, session IDs and private diagnostic identifiers out
  of it; preserve private recovery references in the ignored local handoff.

## Compatibility priority

- Big Sur and pinned older Discord runtime builds are intentional targets.
- When adding or updating an internal compatibility patch, document it in
  `docs/fork-specific-changes.md` with an explicit runtime target, using
  `Adapted to support Electron <version or range>` (current target: `35.x–37.x`),
  the missing capability, supporting evidence and retirement criteria. Name the
  Bun version separately for build/test compatibility. Distinguish the target
  range from verified native versions, and do not attribute Discord/React module
  differences to an Electron version without evidence.
- Keep `docs/fork-overview.md` and its README link/summary current when adding,
  changing or retiring intentional fork features and improvements. Audit the
  detailed fork record for omitted features, but exclude temporary optional fixes
  that upstream can replace from this simplified overview. Runtime targets may be
  summarized there; individual workaround evidence and preservation rules stay in
  `docs/fork-specific-changes.md`.
- Preserve upstream plugin inputs/defaults, outputs, callbacks, events and
  lifecycle through capability-based internal adaptation. Avoid fork-only public
  APIs and speculative version gates. Keep upstream UI, defaults and settings
  removals unless a concrete fork requirement needs the old behavior.
- Older-client support does not freeze obsolete internals or historical plugin
  contracts. Adopt upstream lifecycle/API changes and removals when supported
  clients can run them; the removed plugin `load()` hook is distinct from
  `BdApi.Utils.loadEntry`. Retain fallbacks only for demonstrated missing
  capabilities or protected behavior; retire them when upstream verifiably covers it.
- Maintain optional helpers in `docs/plugin-api-notes.md`: purpose, example,
  availability and limitations; update it when adopting or retiring APIs.
- Each newly adopted optional API/feature requires a focused audit on the
  supported older client, including its public contract and a real consumer or
  discovery path, even if installed plugins do not use it. Follow the Runtime
  Audit Workflow below. Keep source/native evidence separate: no crashes or an
  unused API is not a runtime pass. Reuse unchanged helper evidence (including
  `loadEntry`); repeat when implementation, contract or runtime capabilities
  change. Mark untested/unavailable paths in the checklist and API reference.

## Upstream sync and fork-contract record

Never merge `upstream/development` directly into `develop`; always review it
through `upstream-development` first. For every request to review or adapt
"through commit X", start with a minimal safety check of status/remotes, then
fetch fresh upstream history before relying on any local branch, cached SHA, or
memory:

```zsh
git fetch upstream development
```

Safely refresh local `upstream-development` from the fetched
`upstream/development`; do not overwrite unique staging commits or a checked-out
worktree. Record the fetched head SHA and fetch time. If fetch fails, stop and
report it. This fetch-and-refresh is the required pull/update step. Never run
`git pull upstream development` on `develop` before review.

Resolve requested `X` to its full SHA, confirm it is in the freshly fetched
`upstream/development` history, and pin that SHA as the reviewed cutoff. “Latest”
means the head just fetched. A staging branch may contain later commits than
the cutoff: inspect only through the pinned target and never silently widen the
review. Before implementation, record the `develop` base SHA, clean/dirty
state, last integrated upstream ancestor, and remaining upstream commits.
Before changing `develop`, create a named local-only backup ref at its starting
SHA; preserve existing backup refs and never stash unrelated user work. All
fork implementation work belongs on `develop`.

Before classification, read every relevant section of
`docs/fork-specific-changes.md`, including its required checks. Review both the
incoming commit range and its net tree/file diff against `develop`; inspect
overlapping changes and conflicts rather than treating a textual merge as
proof of safety. Maintain a durable ignored checklist at
`mergedocs/UPSTREAM_MERGE_<short-sha>.md`. Reuse an existing checklist without
erasing its history. Record target/base/range, scope authority (plan-only,
implementation, build, injection, or push), change groups and file ownership,
decisions with evidence, commits, checks, and the next step. Planning alone
does not authorize implementation; a request to implement authorizes continuing
without a redundant approval request. Existing injection and push authorization
limits still apply. Follow the global serial delegation rules; this workflow
does not opt into concurrent work.

Classify every incoming commit and meaningful change group, including partial
hunks, as one of: **accept unchanged**; **adapt internally** to preserve
upstream public behavior; **retain fork hunk** with evidence; **skip upstream
hunk** with a concrete reason; or **already covered/superseded** (history only).
Reassess each overlapping prior fork fix against the new upstream execution
path: **still required**, **partly superseded**, **fully superseded**, or
**unresolved**. Trace its original trigger and protected behavior, identify the
upstream replacement, and verify which parts remain necessary. Preserve the
required behavior rather than obsolete implementation; do not retain a patch
solely because it was a previous fork fix. Record the evidence, retained and
retired parts, and unresolved runtime checks in the checklist. Existing explicit
protection/approval boundaries still apply. Skipped and history-only commits
still belong to the reviewed ancestry range; do not imply their behavior was
adopted.

Before removing or simplifying any hunk during adaptation, trace what it
actually does, including callbacks, navigation steps, effects, subscriptions,
cleanup, defaults, and alternate entry points. Do not assume adjacent code is
obsolete merely because a setting or workaround is being removed. Identify
the replacement that preserves each still-required behavior and verify it with
focused evidence; retain the hunk when its purpose or replacement is unproven.
Review deleted lines against both upstream and the fork, including ordinary
routes, context-menu shortcuts and other UI entry points. Record deliberate
behavior removals separately.

Keep source as close to upstream as possible. Optional fork fixes are temporary:
when upstream demonstrably fixes the same issue, adopt its implementation and
retire the equivalent local hunk. Retain an optional internal adaptation only
for a demonstrated compatibility gap in older Bun or the supported pinned
Discord client; implementation differences alone do not justify a fork variant.
Document the trigger, evidence and retirement criteria in
`docs/fork-specific-changes.md`. Separately required custom fork behavior and
unrelated protections remain subject to their existing preservation rules.
Restoring upstream behavior accidentally dropped during adaptation is a
correction, not a new fork-specific contract. Record the correction in the
review checklist and correct stale documentation; only document a separate
fork divergence if the resulting implementation actually needs one.

Apply the compatibility priorities above and the fork inventory below. Do not
demand plugin updates for internal-only changes.

Implement one coherent reviewed group at a time on `develop`. Run targeted
existing tests and applicable lightweight lint/type checks for that group; add
a focused regression test only when needed to cover meaningful new behavior.
Avoid redundant test matrices. After a group passes, update
`docs/fork-specific-changes.md`, commit the group with that record, and add its
commit and evidence to the checklist before starting the next group. Use the
trace workflow below when runtime tracing is required.

Recording upstream "in history" means preserving its ancestry, not rebasing
published commits. Do not rewrite, rebase, or squash published `develop`
history without explicit user instructions. A patch or cherry-pick alone does
not record upstream ancestry. Once every commit through the pinned target has
a reviewed disposition, make that target an ancestor with a reviewed normal
merge when its tree changes are appropriate, or a tree-neutral history merge
when no upstream tree changes should be imported. If the merge also updates
the fork-contract record, verify its only tree change is that documentation;
describe it as source-neutral rather than claiming identical trees.
Ancestry may be recorded before or after adaptation commits according to the
reviewed plan. Verify the actual parents and diff; never import a newer staging
head beyond the pinned target. Integration is complete only after every adopted
group is verified. Do not force the count to zero by marking an unreviewed range
complete. Verify both:

```zsh
git merge-base --is-ancestor <target-sha> develop
git rev-list --count develop..<target-sha>
```

The first must succeed and the second must be `0`. Report any newer fetched
range separately; do not claim full-head parity. The required fork-record update
must accompany every integration before commit/push and include the upstream
range, accepted/adapted/retained behavior, future merge contract and verification.
Audit-only reviews may defer it until integration.

Finish with the validation/release checks in the Build section below. Hand off
specific runtime checks when the user owns injection; keep native evidence
distinct from mocks/static checks.
Honor any agreed live-test gate before publication. Push only when authorized,
and never publish local backups, ignored checklist files, or trace stashes.
After an authorized push, confirm the exact remote SHA and follow applicable
Actions runs through completion; do not silently enable disabled workflows.
For rolling-release CI, verify the intended `develop-latest` target and assets.

## Merge review, conflicts, and workflows

- Generally safe after checking fork overlap: isolated upstream bug fixes,
  low-risk types/refactors, tests, and docs that do not replace fork policy.
- Explicitly review injection/preload, Electron startup, Discord/Webpack lookup,
  settings/search, updater, addon lifecycle, workflows/branch assumptions, and
  Stable/PTB/Canary-sensitive behavior.
- On conflict or uncertainty, keep the fork hunk unless the user approves its
  replacement; stop and explain the risk before asking. Port only proven-compatible
  upstream logic; for partially safe
  files, take safe hunks and report exactly what was merged, adapted, or skipped.
- Never automatically merge or rewrite `.github/workflows/ci.yml` or
  `.github/workflows/crowdin.yml`. Inspect and report upstream workflow drift,
  its risk/usefulness, and whether it merits a separate manual follow-up.

## Build, injection, and upstream verification

- Use the smallest relevant checks, but never skip verification entirely.
- After all upstream adaptations, run required full local validation once. Fix
  actual failures and rerun affected checks; avoid unrelated cleanup. Reuse
  passing evidence for unchanged source when only documentation changes.
- Dev loop: `./local-build.zsh build --module=betterdiscord`, then—only when
  authorized—`./local-inject.zsh <stable|ptb|canary> dev`; this points at unpacked
  `dist/` and is for quick iteration only.
- Final release verification: after required source checks and the final commit,
  run `./local-build.zsh dist -mrts 45`, then—only when authorized—
  `./local-inject.zsh <stable|ptb|canary>`. Release injection uses
  `dist/betterdiscord.asar`; rebuilding only `betterdiscord.js` is insufficient.
  Rebuild after any later commit so bundle metadata matches HEAD. Verify all
  eight inputs in both packed/unpacked releases against checksums; search source/built output
  for temporary trace markers.
- Every local fork-validation `dist` build uses `-mrts 45`, matching CI; the
  underlying direct-build default remains 90 seconds.
- For runtime lookup or injection changes, verify the affected behavior directly;
  reinject Stable through the final release flow for injection changes, and
  spot-check PTB/Canary when client differences are possible.
- `./local-uninject.zsh <client>` restores stock. Its optional
  `auto|release|dev` argument validates the loader mode before restoration and
  recognizes this fork's macOS absolute `/dist/betterdiscord.asar` loader.

## Runtime Audit Workflow

Use this only for requested live export/runtime lookup verification.

1. Keep the targeted audit plugin in `.tmp/`; update it when runtime expectations
   change. Manage its symlink directly, including unlink/re-link, without waiting
   for confirmation; OBD handles file load/unload automatically. The user manually
   enables it after a fresh link/re-link. Do not edit `plugins.json` to enable it
   or make it a permanent feature unless explicitly asked.
2. Verify Stable first, then PTB/Canary when client differences matter. Use the
   authorized build/injection loop above; a completed fix requires fresh release
   injection, full relaunch and a report/log pass, not only dev injection. After
   20–30 seconds, compare client-prefixed reports with the newest OBD debug/console log.
3. Reports should be bounded, automatic and UI confirmation tooltip-based, not dependent
   on console commands. Force-load only gentle targets; skip any target that
   risks freezing startup.
4. Remove audit symlinks/reports when finished unless asked to retain them.
   Revert only related uncommitted experiments when abandoning a tentative fix.

## Trace-First Runtime Debugging

When tracing is required, read the automatically selected
`zr0-betterdiscord-electron-workflow` skill and its
`references/runtime-tracing.md` before adding diagnostics. It defines bounded
execution tracing, patch/stash preservation, restoration and retention. Keep
traces local/uncommitted; never publish them or use `git stash pop` or diagnostic
Git tags. Preserve the complete trace before permanent fixes and retain it until
the user explicitly authorizes deletion.

### AdGuard and HTTPS failures

When HTTPS succeeds in the terminal but stalls inside Discord, consider AdGuard
filtering before changing OBD's transport or increasing timeouts. A previous
git.slowb.ro update request completed TLS but received no response headers;
the same OBD build succeeded after the user disabled AdGuard and relaunched.
This is a diagnostic lead, not proof that every HTTPS failure has the same cause.
Compare the actual Discord request with filtering off or a host-specific HTTPS
exclusion, under user control. DNS allowlisting, HTTPS inspection and Network
Extension exclusions are distinct; verify the relevant exclusion in Discord
before declaring the issue resolved. Do not change AdGuard settings automatically.

### Permanent fix after tracing

- Explain the trace evidence and the exact failed ownership/order/state
  transition before changing production code.
- Restore the exact clean base, then implement the smallest fix that addresses
  the observed path. Keep speculative hardening separate unless evidence or the
  user requires it.
- Remove every trace import, helper, marker, and logging call from production
  source before validation. Search the source and built bundle for the marker.
- Add tests for the permanent behavior, including the runtime shape the trace
  exposed. Do not copy the diagnostic logger into the tests.
- Update `docs/fork-specific-changes.md` when the fix creates or strengthens a
  fork divergence.
- Run the pinned-Bun checks appropriate to the changed area, then build with the
  user's requested `local-build.zsh` options.
- Commit the permanent fix only after source checks and the first production
  build pass. Rebuild after committing so the ASAR records the new commit.
- Wait for the user's injected runtime confirmation before pushing when that is
  the agreed handoff. Diagnostic retention rules above still apply after push/CI.

### Preserved addon-search diagnostic

The retained addon-search investigation is a reference example for this workflow.
Preserve its local stash and patch until the user explicitly authorizes deletion.
Exact identifiers and checksums belong in the ignored local handoff. Stash
indices may change; locate retained stashes by message and object ID. Do not tag
them or publish private trace artifacts.

## Required User Report After Upstream Review

Give a concrete merge report covering:

- Exact branch, fetched head, pinned target/range, ancestry checks, remaining
  newer commits and the fork's post-integration safety.
- Per-group/hunk dispositions and files, including superseded fixes,
  history-only commits and skip/retain reasons; overlapping fixes' still-required/
  partly-superseded/fully-superseded/unresolved status, retained/retired parts and evidence.
- Frontend/backend scope, concrete plugin impact, risky files/failure modes,
  workflow drift and its risk/usefulness, and conflict resolutions with evidence.
- Focused/full checks, release build, runtime handoff/evidence and their limits;
  remote SHA and completed Actions/release evidence when publishing was authorized.
  Never imply unverified native success, publication or parity.

## Fork-Specific State To Preserve In Future Merges

Preserve this inventory during merges unless the user explicitly approves a change.

Docs, ignore rules, and release metadata:

- README CI badges point at `XxUnkn0wnxX/OpenBetterDiscord` and branch `develop`
- `docs/manual-install.md` documents the fork's Bun build, normal injection, and local macOS wrapper workflow
- CI publishes the rolling `develop-latest` release instead of upstream's canary
  tag/release flow and keeps the timeout flow at 45 seconds. Normal push and
  pull-request triggers target `develop`; manual dispatch can publish its
  explicitly selected ref.
- Release pack writes `dist/checksums.txt` with 8 file checksums for the release
  payload inputs, and CI exposes distinct ASAR/checksums artifacts while rolling
  both under `develop-latest`.

Wrapper and injector details:

- `scripts/inject.ts` runs sanity checks against `dist/`, even when release injection points at `dist/betterdiscord.asar`
- Windows/Linux injector, uninjector, and migration discovery supports both `app-X.Y.Z` and plain `X.Y.Z` directories, but only when they contain the modern application ASAR/wrapper payload; do not restore desktop-core-only injection
- if upstream changes injection structure again, preserve this fork's current cross-platform discovery, local wrappers, macOS recovery/PID/logging, and Open BetterDiscord/OpenAsar handoff plumbing; adapt only the required target layout and paths (currently Open BetterDiscord lives in `Contents/Resources/app/`, followed by the stock or OpenAsar payload in `Contents/Resources/betterdiscord.app.asar`) unless the user explicitly approves replacing the plumbing
- macOS installed recovery uses `/usr/bin/env zsh -f` with a fixed system `PATH` and a small environment allowlist; Bun remains build/manual injection tooling only
- preserve the build-time `--macos-recovery-timeout-seconds` option and `BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS`; direct builds default to 90 seconds, fork workflows use 45 seconds, and matching OpenAsar builds add their own 10-second Open BetterDiscord handoff grace
- macOS recovery keeps per-run wrapper assets under a unique recovery ID, owns `betterdiscord-update-helper.pid` as a detached process-group leader, and stops its helper descendants when that PID receives `TERM`
- superseded or terminated macOS helpers remove only their own recovery-run assets; `TERM` rolls back an owned pre-publication move but must not touch state owned by another run or undo a wrapper already published through `wrapper-ready.json`
- preserve the two replace-per-run logs in `betterdiscord-bootstrap`: `betterdiscord-bootstrap.log` and `betterdiscord-bootstrap-console.log`
- preserve Open BetterDiscord/OpenAsar coordination through matching installation/channel/target identity, source Discord PID, OpenAsar handoff ID, Open BetterDiscord recovery run ID, and `wrapper-ready.json`; Open BetterDiscord rebuilds the wrapper first and OpenAsar then restores the nested payload
- if OpenAsar's prepended quit guard publishes after Open BetterDiscord arms, Open BetterDiscord may adopt it only for the same source Discord PID and its exact recovery run, then must freeze that handoff ID
- normal or fast user quits may repair replaced ASARs but must stay closed; only a current explicit updater-restart signal may authorize either helper to relaunch Discord
- when a live, identity-matched OpenAsar helper already owns a fresh `wrapper-ready.json` handoff, Open BetterDiscord's macOS `before-quit` path must preserve that marker and skip a redundant recovery arm; never reintroduce the early-launch quit race that deletes the handoff before OpenAsar restores the nested payload
- accept optional legacy `helperRuntime` marker data for safe upgrades, but never write or execute Bun from installed recovery

Updater and runtime behavior:

- Open BetterDiscord core update checks are disabled at startup, on the scheduler,
  and from the Updates-panel action; keep all three calls commented out and
  dormant.
- Plugin and theme updater checks remain active; do not suppress `PluginUpdater` or `ThemeUpdater`
- Enabled-state handling treats every plugin/library equally; never force a
  library always enabled.
- Addon Store remains enabled unless the user asks to disable it; transient `AddonStore` network errors are not core updater checks
- do not reintroduce the old macOS `app-*` native module fallback for Discord native modules in `src/electron/preload/init.ts`; prefer upstream's preload implementation unless it breaks the local wrapper flow

Discord/webpack compatibility patches:

- `src/betterdiscord/utils/object.ts`: guarded `mapObject()` access for bad module exports/getters
- `src/betterdiscord/builtins/general/themeattributes.tsx`: wrapped export handling and safer message tree walking
- `src/betterdiscord/webpack/shared.ts`: guarded declaration access so throwing declaration getters do not kill lookup
- `src/electron/preload/early/index.ts` and `src/common/findFunctionBodyStart.ts`: safer early bundle parsing, third-party bypass, function-body detection, and tests
- `src/betterdiscord/modules/discordmodules.ts`: stale `DiscordMarkdown` lookup removal

Durable Stage 1–5 compatibility notes:

- Activities frame handling: `contentWindow` access is allowed only for valid `*.discordsays.com` URLs. Other cases route through the URL proxy path and keep local storage behavior aligned.
- Settings integration (`src/betterdiscord/ui/settings.tsx`): `getBetterDiscordSectionIndex()` keeps resilient placement (`footer -> games_and_apps_section -> activity section -> activity children -> append`), plus stable DOM version/debug-copy behavior and close-order fallbacks.
- Accent and editor behavior: startup and live updates remain queued/coalesced, macOS uses `NSSystemColorsDidChangeNotification` when available before fallback listeners, `EDITOR_CLOSE` remains preserved, and no fork-only AppleAqua signal/version gating is introduced.
- Editor autofocus behavior: Settings-menu and external-window editors focus once when ready. Detached Custom CSS/plugin/theme editors opened from Settings capture the exact active Settings element before closing Settings, wait for that element to disconnect, then focus once on the next animation frame. Invalid or never-disconnected targets intentionally do not autofocus; ordinary click focus remains. Preserve immediate one-shot autofocus for programmatic detached addon opens without a Settings-close callback, open plugin/theme floating windows before invoking that callback, and do not add hover refocus, polling/timeouts, or a renderer-global focus patch.
- Patcher behavior: `BdApi.Patcher.instead` preserves upstream chained observability and execution semantics, while keeping the existing idempotent `unpatch()` guard in `unpatch`.
- Legacy loadEntry compatibility: keep upstream `BdApi.Utils.loadEntry` contract and control flow, using `Map.prototype.getOrInsertComputed` when present and a capability-based private fallback otherwise. Do not mutate `Map.prototype`, add global map helpers, or add Electron/version gates.
- Addon-state durability: preserve enabled-state restoration through atomic rename/reload,
  deterministic case-insensitive serialization order (`0-9` then `A-Z`), exact
  duplicate-key canonicalization, deletion only after manager inventory confirms
  removal, and deferral of malformed/unsafe writes. Do not merge distinct
  case-variant addon IDs.

Other hardened areas include request/fetch/logger/patcher/error-boundary/settings
components and CSS/tooltip/debug/i18n/polyfill/context menus. Compare overlapping
files against both branches and apply the conflict/uncertainty rule above.
