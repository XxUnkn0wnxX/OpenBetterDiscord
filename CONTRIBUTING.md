# Contributing to Open BetterDiscord

Thanks for helping improve Open BetterDiscord.

This guide covers development with Bun and runtime verification on macOS,
including Big Sur and pinned older Discord releases. The normal Bun commands
work without Zsh; the local wrappers remain optional macOS tools for automatic
client closing.

**Guide:** [Fork changes](docs/fork-specific-changes.md) · [Build and inject](docs/build-and-injection.md) · [macOS wrappers and recovery](docs/manual-install.md) · [Build and test](#build-and-test) · [Runtime verification](#runtime-verification-on-macos) · [Report a bug](#reporting-bugs)

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Before changing a
fork-sensitive area, also read:

- [Bun build and injection](docs/build-and-injection.md)
- [Manual macOS wrappers and recovery](docs/manual-install.md)
- [Fork-specific changes and upstream policy](docs/fork-specific-changes.md)

Changes intended only for the upstream BetterDiscord project should be proposed
upstream. Open BetterDiscord behavior, macOS wrapper/recovery work, and bugs
reproduced in this repository belong in the
[issue tracker](https://github.com/XxUnkn0wnxX/OpenBetterDiscord/issues).

## Branch and pull requests

The working and pull-request target branch is `develop`.

Keep changes focused, preserve existing authorship, and explain any intentional
departure from upstream behavior. Do not rewrite workflows, injection plumbing,
or OpenAsar coordination as part of an unrelated change.

When upstream changes its Web, Electron, or Discord-runtime assumptions,
preserve its public/plugin contract. Verify the change on older supported
targets and use a narrow capability-based backport when needed, rather than a
fork-only API.

## Local setup

Clone the fork and install dependencies with Bun:

```sh
git clone --branch develop https://github.com/XxUnkn0wnxX/OpenBetterDiscord.git
cd OpenBetterDiscord
bun install
```

Open BetterDiscord is a single TypeScript project built and tested with Bun. Its
code is split by where it runs inside Discord:

| Area | Contents |
| --- | --- |
| `src/betterdiscord/` | Renderer UI, settings, addons, APIs, and runtime logic |
| `src/electron/main/` | Electron main process, windows, IPC, and macOS recovery |
| `src/electron/preload/` | Preload scripts and cross-context APIs |
| `src/common/` | Code shared across process boundaries |
| `scripts/` | Build, pack, inject, uninject, and resource-discovery tooling |
| `tests/` | Bun tests for shared, renderer, Electron, and wrapper behavior |
| `docs/` | Fork behavior, Bun build/injection, and macOS wrapper guides |

## Build and test

Run the checks relevant to the files you changed. Close every Discord channel
before the final `dist` command because it replaces the shared managed ASAR.
The normal complete gate is:

```sh
bun ./node_modules/eslint/bin/eslint.js
bun ./node_modules/typescript/bin/tsc --noEmit
bun test --timeout 10000 tests/
bun run release -mrts 45
```

For targeted TypeScript/TSX linting:

```sh
bun ./node_modules/eslint/bin/eslint.js path/to/changed-file.ts
```

CSS follows the root [`.stylelintrc`](.stylelintrc); TypeScript and TSX follow
[`eslint.config.js`](eslint.config.js).

Do not upgrade Bun merely to make a test run on one checkout. This fork keeps a
narrow Bun 1.1.20/macOS 11 compatibility path while newer Bun versions retain
their normal test coverage.

## Runtime verification on macOS

For quick renderer iteration:

```sh
bun run dev --module=betterdiscord
bun run inject stable
```

Close every Discord channel before `bun run release`, which replaces the shared
managed ASAR. Normal Bun inject and uninject commands close only the selected
channel and leave it closed; dry-run, check, and prepare-only operations do not
close a client. After renderer changes, rebuild before reopening Discord. To
rebuild automatically, run
`bun run dev --watch --module=betterdiscord` in another terminal. Main-process
and preload changes require a full Discord relaunch.

`bun run release` builds and stages the packaged release; legacy `bun run dist`
remains equivalent. In contrast, `bun run inject dist stable` selects unpacked
development output, like the direct injector's `dev` mode. The macOS wrapper
uses `dist` as a development alias too; see the
[mode guide](docs/build-and-injection.md).

Before calling an injected change complete, use the release ASAR:

```sh
bun run release -mrts 45
bun run inject release stable
```

Open Discord after injection and verify the affected behavior directly. Use PTB
or Canary only when the change could differ by Discord channel. The optional
macOS `local-inject.zsh` wrapper is documented in the
[wrapper guide](docs/manual-install.md).

## Protected fork behavior

Changes in these areas need an explicit compatibility review:

- application-ASAR injection, safe uninject, macOS recovery, and the
  Open BetterDiscord/OpenAsar handoff;
- Settings placement, navigation, version/debug-copy behavior, and Custom CSS;
- plugin loading, which must not special-case `0BDFDB.plugin.js` or another
  plugin library;
- plugin/theme updates, source identity validation, and atomic replacement;
- upstream plugin APIs and Webpack helpers on older macOS and pinned older
  Discord/Electron builds;
- Open BetterDiscord core updates, whose startup, scheduled, and manual entry
  points remain disabled;
- fork workflows, wrappers, documentation, badges, and `develop` assumptions.

If an upstream change overlaps one of these areas, preserve the fork behavior
until the conflict has been reviewed and runtime-tested. Compatibility adapters
must preserve upstream inputs, outputs, ordering, errors, and plugin-visible
calls unless a separately reviewed upstream bug fix intentionally changes them.

## Translations

Shared language translations belong in
[upstream Crowdin](https://translate.betterdiscord.app). Submit changes there;
direct edits to imported locale files may be overwritten by later upstream or
Crowdin refreshes.

`assets/locales/en-us.json` supplies source strings. Add shared strings upstream
and preserve fork-only English keys when refreshing this fork's catalogue.

## Reporting bugs

Before opening a fork issue:

1. Check for an existing matching issue.
2. Reproduce with the current `develop` branch and a release injection.
3. Confirm the problem is not caused only by a plugin or theme when practical.

Include:

- macOS and Discord channel/version;
- the embedded Open BetterDiscord branch/commit;
- exact reproduction steps and expected behavior;
- whether OpenAsar is installed;
- relevant screenshots and the newest scoped Open BetterDiscord debug log;
- the plugins/themes needed to reproduce the issue.

Do not send fork-only injector, updater, or OpenAsar integration problems to the
upstream installer support flow.

## Commit style

- Use a concise imperative title.
- Explain behavior and compatibility decisions in the commit body.
- Group larger messages into sections such as `Feature`, `Fixes`, and
  `Verification`.
- Keep documentation and source comments synchronized with intentional fork
  differences.
- Never commit `.tmp/`, `tmp/`, local runtime reports, credentials, or generated Discord
  application files.

## License

By contributing, you agree that your contribution is provided under this
repository's [Apache License 2.0](LICENSE.md).
