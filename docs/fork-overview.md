# Open BetterDiscord overview

Open BetterDiscord is currently a macOS Big Sur 11.7.1 backport of
BetterDiscord. The longer-term goal is greater project independence and user
choice. This overview describes current behavior and does not announce a
security-policy change.

This page is a concise map of intentional fork features. The detailed
[fork-specific behavior record](fork-specific-changes.md) remains authoritative
for preservation rules, source evidence, replacement criteria and upstream
merge decisions.

## Compatibility approach

| Area | Maintained target |
| --- | --- |
| macOS | Big Sur 11.7.1 and standard local Discord installations. |
| Discord runtime | Pinned clients targeting Electron **35.x–37.x**; exact current host builds are listed in the [README](../README.md). |
| Build tooling | Bun **1.1.20** is a temporary older-host compatibility pin, separate from the Discord runtime target. |

Open BetterDiscord adapts internal code when a supported runtime lacks a
capability, while keeping upstream plugin APIs, inputs, callbacks and lifecycle behavior.
Runtime evidence is specific to the feature and client tested; the target
range does not mean every version has passed native validation.

## Intentional fork features

| Feature | Behavior |
| --- | --- |
| Fork identity and artwork | Open BetterDiscord labels and OBD marks identify the fork. Shared icons inherit caller colors for idle, selected and hover states. See the [branding and UI map](branding.md) for artwork replacements and source locations. |
| Build and macOS recovery | Normal [Bun commands](build-and-injection.md) build, stage, inject and remove the fork. Release injection uses a verified ASAR in the current user's standard BetterDiscord data folder; explicit dev mode uses unpacked output. The macOS-only Zsh wrappers default to release; explicit dev/dist modes use unpacked output. Both entrypoints close the selected client and leave it closed. Update recovery preserves the wrapped payload and identity-matched OpenAsar handoffs. |
| Identity-aware addon updates | Plugin and theme updates can use declared `@updateUrl` sources and eligible Addon Store entries. Identity is checked before version comparison; the highest comparable newer candidate wins, and `@updateUrl` wins an equal-version tie. A filename match alone cannot replace an unrelated addon. Optional notifications default on and provide success toasts and persistent failure cards. See the [updater guide](addon-updater.md). |
| Optional provider tokens | GitHub, GitLab.com and git.slowb.ro (Forgejo) tokens can authenticate eligible requests from Open BetterDiscord's managed addon updater. They do not become credentials for public `BdApi.Net.fetch` calls or independent plugin updaters. See [token setup](provider-tokens.md). |
| Update policy | Open BetterDiscord core update checks stay dormant at startup, on the scheduler and from the Updates panel. Plugin/theme checks and the Addon Store remain active. |
| Disabled addon behavior | Disabled plugins and libraries stay disabled; no library receives a special loading bypass. |
| Recovery reporting | The recovery screen can open drafts for supported GitHub, GitLab.com and git.slowb.ro (Forgejo) repositories. Reports include a collapsed Client Info block and are never submitted automatically. When no supported source is available, **Manual report** copies the formatted report and Client Info to the clipboard. |
| Addon settings UI | The Addon Settings Location preference selects Full Page (default) or Floating Modal using the existing provider. In full-page settings, the leading back-arrow breadcrumb returns to the addon list without closing Discord Settings. |
| Keyboard focus feedback | An optional scoped indicator makes keyboard focus easier to see in Open BetterDiscord controls without changing focus order or native UI outside Open BetterDiscord. |
| Release provenance | The rolling `develop-latest` release includes the ASAR and checksums for all eight payload inputs. Build metadata records the branch and commit for verification and support. |

Temporary optional fixes that upstream can replace are tracked in the
[detailed fork record](fork-specific-changes.md) rather than presented as features
in this overview.

## Further documentation

- [Build, inject and remove the fork](manual-install.md)
- [Plugin and theme updates](addon-updater.md)
- [Provider token setup](provider-tokens.md)
- [Fork contracts and upstream adaptation](fork-specific-changes.md)
- [Documentation index](README.md)
