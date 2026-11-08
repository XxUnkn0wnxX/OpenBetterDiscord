# Open BetterDiscord branding and UI map

This page maps the approved OBD marks to their source implementation and visible
uses. The files under `.images/internals/` are reference copies and previews;
they are not imported by the build. The shared logo paths are written directly
in the TSX component, while the loading indicator uses its SVG source file.

## Client marks

| Reference SVG | Replaces | Source component and UI use |
| --- | --- | --- |
| [Monochrome OBD logo](../.images/internals/brand-obd-logo-monochrome.svg) | `brand-betterdiscord-logo-monochrome.svg`: the original two-path BD artwork written in `BDLogo`, in its default mode. | [`logo.tsx`](../src/betterdiscord/ui/logo.tsx) contains the replacement paths directly. `Logo.Discord` supplies the Settings collection sidebar icon in [`settings.tsx`](../src/betterdiscord/ui/settings.tsx#L267). |
| [Outlined O/B logo](../.images/internals/brand-obd-logo-accented.svg) | `brand-betterdiscord-logo-accented.svg`: the original two-path BD artwork in `BDLogo` when `accent` is true. | [`logo.tsx`](../src/betterdiscord/ui/logo.tsx) contains the replacement paths directly. The direct callers are the plugin/theme update notice in [`addonupdater.ts`](../src/betterdiscord/modules/addonupdater.ts#L1504), the suspected-plugin crash-recovery warning notice in [`recovery.tsx`](../src/betterdiscord/builtins/developer/recovery.tsx#L397), and the dormant core-update notice in [`updater.ts`](../src/betterdiscord/modules/updater.ts#L150). The recovery callout is a warning notice, not the whole recovery page. |

The old `brand-betterdiscord-*` names identify the exported artwork used for
review; they were not SVG imports in the application. Both replacements reuse
the approved loading mark's three-path geometry. Their `.images/internals/`
files remain references rather than build inputs.

`Logo.DiscordAccented` remains exported from `logo.tsx`; there is no current
direct caller of that adapter. The `updater.ts` notice is dormant because core
update checks remain disabled, so it does not currently appear.

Both shared variants keep the existing `Logo` component contract and wrappers,
including `color`, `secondaryColor`, `ref`, `size`, and the
`lucide-betterdiscord` class. The paths use `currentColor` so they follow the
surrounding UI color. The monochrome variant fills all three shapes. With
`accent` enabled, O and B use no fill and a `1.254`-wide current-color stroke;
D remains filled. An explicit `strokeWidth` still takes precedence.

## Loading indicator and README wordmarks

| Reference SVG | Replaces | Source or presentation use |
| --- | --- | --- |
| [Loading indicator](../.images/internals/obd-loading-indicator.svg) | The original BD SVG embedded as Base64 in `loadingicon.ts`. | [`assets/svgs/obd-loading-indicator.svg`](../assets/svgs/obd-loading-indicator.svg) is the actual import in [`loadingicon.ts`](../src/betterdiscord/loadingicon.ts), embedded into the bundle for the 20-pixel animated boot indicator. It keeps its own red, blue, and white artwork. |
| [Two-line wordmark](../.images/Open-Better-Discord-two-line.svg) | The upstream BetterDiscord README banner. | Used by the root [README](../README.md) hero. It is not a client UI asset. |
| [Three-line wordmark](../.images/Open-Better-Discord-three-line.svg) | No current replacement; retained presentation alternative. | It has no current README or client UI call site. |

## Verification scope

This map describes source wiring and intended UI locations. Source checks and
reference previews do not establish native theme or hover behavior. Release
verification belongs to the built artifact and its checksums; native UI validation
remains a separate client check.
