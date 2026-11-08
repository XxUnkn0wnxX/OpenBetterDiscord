# Build and injection with Bun

The normal build, injection, and removal commands run through Bun and do not
require Zsh. The repo [Bun configuration](../bunfig.toml) selects Bun for the
`bun run` shell. Bun **1.1.20** is the current temporary host-compatibility pin.
The maintained native workflow targets macOS; Windows, Linux, and WSL paths
are documented for users who choose to try them, not as native validation.

## Quick release

From the repository root, install dependencies and build, pack, verify, and
stage a release with the [`release` command](../scripts/dist.ts):

```sh
bun install
bun run release -mrts 45
```

`bun run dist` remains an equivalent legacy alias. Close every Discord channel
that could read the shared managed release ASAR
before running this command because staging replaces that shared file. Build
commands do not close Discord.

The command leaves `dist/betterdiscord.asar` and `dist/checksums.txt` as release
outputs. It also stages the verified ASAR at the per-user path listed below.
The checksum file covers the eight packed input files; it is not a checksum of
the ASAR itself.

The `release` timeout defaults to 45 seconds. Set
`BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS` to override that default, or pass
`--macos-recovery-timeout-seconds <seconds>` to take precedence over the
environment. The short `-mrts <seconds>` alias is also accepted by `release`
and the local build wrapper. `bun run dev` uses the 90-second build default;
legacy `bun run build` remains equivalent. Timeout values must be positive
whole numbers.

Inject the release ASAR into Stable; the command closes Stable and leaves it
closed:

```sh
bun run inject release stable
```

Replace `stable` with `ptb` or `canary` to select another installed channel.
The normal Bun command closes only the selected channel and leaves it closed.
Dry-run, check, and prepare-only commands do not close a client. The managed
ASAR is shared by Stable, PTB, and Canary, so close every channel before
replacing it.

## Mode names by command

`dist` has different meanings depending on which command receives it:

| Command | Meaning |
| --- | --- |
| `bun run release` | Production build, package and validate the release ASAR, then stage it at the managed per-user path. |
| `bun run dist` | Legacy equivalent of `bun run release`. |
| `bun run inject release stable` | Inject the managed release ASAR. |
| `bun run inject stable`, `bun run inject dev stable`, or `bun run inject dist stable` | Inject the unpacked development output in `dist/`; the direct injector defaults to this mode when only a channel is given. |
| `bun run uninject stable` | Uninject using the default `auto` mode. |
| `bun run uninject stable <mode>` | Select `release`, `dev`, `dist`, or `auto`; `dev` and `dist` both identify the unpacked development loader. |
| `local-build.zsh release` or `local-build.zsh` | macOS-only wrapper for the packaged release flow. |
| `local-build.zsh dev`, `local-build.zsh dist`, or `local-build.zsh build` | macOS-only aliases for an unpacked development build. |
| `local-inject.zsh stable release` | macOS-only wrapper; release is its default mode. |
| `local-inject.zsh stable dev` or `local-inject.zsh stable dist` | macOS-only aliases for injecting unpacked `dist/`. |
| `local-uninject.zsh stable` | macOS-only wrapper; release is its default mode. |

The package aliases `bun run dev` and `bun run release` name the unpacked
development build and packaged release flow. Legacy `bun run build` and
`bun run dist` remain equivalent, respectively. The macOS wrapper modes are
detailed in the [wrapper and recovery guide](manual-install.md). In particular,
the wrapper's `dist` alias means development output; it does not run the
production pipeline of `bun run release` (or its legacy alias `bun run dist`).

## Installed wrapper layout

On macOS, the release file is separate from the ASAR that contains Discord's original
application payload. The injector's [wrapper implementation](../scripts/helpers/injection.ts)
uses these three locations:

| Location | Role |
| --- | --- |
| `Contents/Resources/app/index.js` | Open BetterDiscord-owned startup wrapper. It loads the managed Open BetterDiscord ASAR, then loads the preserved application payload. |
| `Contents/Resources/betterdiscord.app.asar` | Renamed original Discord application payload, which may itself be OpenAsar. |
| `BetterDiscord/data/betterdiscord.asar` under the host's per-user data directory | Open BetterDiscord code used by the wrapper. The host-specific directory is listed below. |

The `betterdiscord.app.asar` filename and wrapper layout follow upstream's
application-wrapper design. This fork adds its ownership marker, update
recovery, path migration, and OpenAsar handoff coordination around that layout;
changing the managed release path does not change the bundle arrangement. The
shared release path is resolved by
[`managedrelease.ts`](../scripts/helpers/managedrelease.ts), while
[`managed-release-path.ts`](../scripts/managed-release-path.ts) prints the
resolved path without writing files.

## Development build

After an initial complete build, rebuild the unpacked renderer output and inject
it into Stable. The injector closes Stable and leaves it closed:

```sh
bun run dev --module=betterdiscord
bun run inject stable
```

`bun run build` remains an equivalent legacy alias for `bun run dev`.

Without the `release` argument, injection uses the existing unpacked `dist/`
output. This is for local iteration and does not read or replace the shared
managed ASAR. Normal injection closes only the target channel and leaves it
closed; dry-run does not close a client.

## Managed release path

The packer creates missing parent directories when it stages the shared release.
The resolver itself only chooses the path and does not write files. Print that
path without writing files with:

```sh
bun scripts/managed-release-path.ts
```

It prefers environment values as shown:

| Host | Managed release path |
| --- | --- |
| macOS | `$HOME/Library/Application Support/BetterDiscord/data/betterdiscord.asar`; falls back to the operating-system home directory when `HOME` is unset. |
| Windows | `%APPDATA%\BetterDiscord\data\betterdiscord.asar`; falls back to `<home>\AppData\Roaming\BetterDiscord\data\betterdiscord.asar` when `APPDATA` is unset. |
| Linux | `$XDG_CONFIG_HOME/BetterDiscord/data/betterdiscord.asar` when `XDG_CONFIG_HOME` is absolute; otherwise `$HOME/.config/BetterDiscord/data/betterdiscord.asar`, falling back to the operating-system home directory when `HOME` is unset. A relative `XDG_CONFIG_HOME` is rejected. |

The packer verifies the ASAR against all eight release inputs before staging.
It writes and validates a temporary sibling, then atomically renames it into
place. A staging failure leaves the previous managed ASAR intact. When `CI` is
affirmatively enabled, the packer skips publication to the local managed path
but still creates the normal `dist/` release outputs. The path resolver and
release injector continue to use the canonical managed path. Before using
`bun scripts/pack.ts` on its own, close every Discord channel that uses the
shared release ASAR. A build-only `bun run dev` writes unpacked files and does
not stage or replace the managed ASAR. `bun run build` remains equivalent.

### Windows Subsystem for Linux

WSL has a specific split-host handoff: packing first stages the ASAR at the
Linux managed path. Release injection then copies it to the existing
Windows-side `betterdiscord` directory and keeps the loader marker
`../../../betterdiscord/betterdiscord.asar`. This does not install the ASAR at
the native Windows `%APPDATA%` managed path.

## Injection and removal

Release injection reads the shared managed ASAR. A dry run follows the same
resolver and reports the proposed wrapper changes without modifying Discord;
the managed ASAR must already exist:

```sh
bun run inject release stable --dry-run
```

For development mode, omit `release`; this uses the existing unpacked output:

```sh
bun run inject stable --dry-run
```

Normal Bun inject and uninject commands close only the selected Discord channel
and leave it closed. A dry-run, check, or prepare-only operation does not close
the client. Inspect removal without changing the installation:

```sh
bun run uninject stable auto --dry-run
```

To remove the wrapper; the command closes Stable and leaves it closed:

```sh
bun run uninject stable auto
```

Uninject restores the payload that the wrapper replaced. A mode mismatch is
refused before changes; use the matching mode or `auto`. Uninject does not
delete the shared managed ASAR or BetterDiscord user data such as settings,
plugins, and themes. The macOS `local-inject.zsh` and `local-uninject.zsh`
wrappers remain available; see the
[macOS wrapper and recovery guide](manual-install.md).

## Checkout moves

If you move or rename the repository checkout, keep Discord closed until you
have rebuilt and reinjected from the new checkout. An existing development
loader may still point at the previous checkout location. Normal Bun use does
not require a symlink to the old repository path.

Installed macOS update recovery is separate from these commands. It uses its
installed helper and system Zsh; it does not invoke Bun.
