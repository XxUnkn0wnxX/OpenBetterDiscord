# BetterDiscord macOS fork

[![CI Status][ci-badge]][ci-link] [![License][license-badge]][license-link] [![Website][website-badge]][website-link] [![Docs][docs-badge]][docs-link] [![Discord][discord-badge]][discord-link] [![Translate][translate-badge]][translate-link]

[ci-badge]: https://img.shields.io/github/actions/workflow/status/XxUnkn0wnxX/BetterDiscord/ci.yml?branch=develop&logo=github&label=develop&style=for-the-badge
[ci-link]: https://github.com/XxUnkn0wnxX/BetterDiscord/actions/workflows/ci.yml
[license-badge]: https://img.shields.io/badge/license-Apache--2.0-3a71c1?style=for-the-badge
[license-link]: LICENSE.md
[website-badge]: https://img.shields.io/badge/upstream-website-3a71c1?logo=firefoxbrowser&style=for-the-badge
[website-link]: https://betterdiscord.app
[docs-badge]: https://img.shields.io/badge/upstream-docs-3a71c1?logo=readthedocs&style=for-the-badge
[docs-link]: https://docs.betterdiscord.app
[discord-badge]: https://img.shields.io/badge/upstream-discord-7289da?logo=discord&logoColor=white&style=for-the-badge
[discord-link]: https://betterdiscord.app/invite
[translate-badge]: https://img.shields.io/badge/upstream-translate-3a71c1?logo=crowdin&style=for-the-badge
[translate-link]: https://translate.betterdiscord.app

An independent [BetterDiscord](https://github.com/BetterDiscord/BetterDiscord)
backport targeting older Discord clients on **macOS Big Sur 11.7.1** and pinned
Discord/Electron builds. Build locally
from `develop`, inject into a standard macOS Discord installation, then open
Discord normally.

The Website, Docs, Discord and Translate badges link to upstream community
resources. This fork uses the local build workflow below, not upstream installer
downloads.

## :sparkles: How this fork differs

<details>
<summary>Intentional fork features</summary>

| Area | Fork behavior |
| --- | --- |
| macOS workflow | Local wrappers build, inject and remove BetterDiscord on Stable, PTB or Canary. Update recovery preserves the application payload and coordinates with OpenAsar. |
| [Addon updates](docs/addon-updater.md) | Selects eligible declared URLs and Store entries by addon identity and version; equal versions prefer the declared URL. |
| [Access tokens](docs/provider-tokens.md) | Optional GitHub, GitLab.com and git.slowb.ro authentication for eligible managed addon updates, with validated settings and masked diagnostics. |
| Update policy | BetterDiscord core checks remain dormant. Plugin and theme updates and the Addon Store remain available. |
| Plugin loading | Disabled plugins and libraries remain disabled; libraries receive no loading bypass. |
| Recovery reports | Drafts supported GitHub, GitLab.com and git.slowb.ro reports with Client Info; Manual report copies details when no supported source is available. |
| Keyboard focus | A scoped visible indicator improves keyboard-focus feedback in BetterDiscord controls without changing focus order. |

</details>

See the concise [fork overview](docs/fork-overview.md) for the feature map. The
[fork record](docs/fork-specific-changes.md) defines preservation and
replacement criteria for future upstream merges, including reinjection review
on a supported newer system.

## :apple: Supported workflow

This repository is maintained and documented for standard local Discord
installations on macOS. Upstream code may continue to support other operating
systems, but Windows and Linux installation are outside this fork's supported
workflow.

macOS Big Sur is an active compatibility target. Maintain compatibility with
**Electron 35.x–37.x** for pinned Discord Stable builds in the
`0.0.350`-`0.0.402` range. New upstream features must account for those older
client runtimes, even when the development dependency uses a different Electron
version. Use capability-based internal adaptations when a missing API is
demonstrated, preserving upstream plugin contracts.

Current pinned client targets, verified from installed application metadata on
2026-11-08:

| Discord branch | Discord version | Electron version |
| --- | --- | --- |
| Stable | `0.0.402` | `37.6.0` |
| PTB | `0.0.248` | `37.6.0` |
| Canary | `0.0.1205` | `37.6.0` |

Electron **37.6.0** has recorded native validation in the
[fork record](docs/fork-specific-changes.md); evidence remains specific to the
feature and client tested. Local builds and tests use **Bun 1.1.20**, the
temporary older-macOS tooling pin. Passing those checks does not establish a
native pass on every target, and Discord may stop serving or connecting to
historical client builds.

Prerequisites:

- macOS with Discord Stable, PTB, or Canary installed normally;
- [Bun](https://bun.sh/) **1.1.20**, the current temporary host-compatibility
  pin in `package.json`, available in `PATH`;
- Git and Zsh.

## :hammer_and_wrench: Build and inject

Clone the fork's `develop` branch and install its dependencies:

```sh
git clone --branch develop https://github.com/XxUnkn0wnxX/BetterDiscord.git
cd BetterDiscord
bun install
```

Build a release ASAR and inject it into Discord Stable:

```sh
zsh local-build.zsh dist -mrts 45
zsh local-inject.zsh stable
```

The injector closes the selected Discord client before changing its wrapper.
Open Discord again after the command finishes. Replace `stable` with `ptb` or
`canary` when needed.

For a quick renderer-development loop:

```sh
zsh local-build.zsh build --module=betterdiscord
zsh local-inject.zsh stable dev
```

Use a release build for final runtime verification. The dev mode points Discord
at the unpacked `dist/` output and is intended only for local iteration.

## :wastebasket: Remove the fork

Restore the payload that existed before BetterDiscord wrapped it:

```sh
zsh local-uninject.zsh stable auto
```

This preserves a nested OpenAsar payload when one was already installed.

## :book: Documentation

| Guide | Find |
| --- | --- |
| [Build and injection](docs/manual-install.md) | Release/dev modes, dry runs, recovery, OpenAsar and removal |
| [Plugin and theme updates](docs/addon-updater.md) | Sources, selection rules, scheduling and troubleshooting |
| [Access tokens](docs/provider-tokens.md) | Token creation, permissions, validation and logs |
| [Plugin API notes](docs/plugin-api-notes.md) | Optional helpers, examples and runtime evidence |
| [Fork record](docs/fork-specific-changes.md) | Preserved behavior and upstream integration decisions |

[All documentation](docs/README.md) · [Contributing](CONTRIBUTING.md) ·
[Changelog](CHANGELOG.md) · [License](LICENSE.md)

## :link: Upstream and license

BetterDiscord is the upstream project. This fork preserves upstream authorship
and remains available under the [Apache License 2.0](LICENSE.md). Fork-specific
support and changes should be handled in this repository rather than through
the upstream installer support flow.
