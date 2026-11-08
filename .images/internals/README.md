# Open BetterDiscord internal artwork references

These are reference copies and PNG previews for the client UI. This directory is
not a build input: the logos are path data written directly in `src/betterdiscord/ui/logo.tsx`,
while the loading indicator is imported from its source SVG.
All SVGs have transparent backgrounds. PNG previews are 512 × 512 with transparency.

| Artwork | Status | Build source or intended use |
| --- | --- | --- |
| [Loading indicator](obd-loading-indicator.svg) · [PNG](obd-loading-indicator.png) | Applied and imported | Exact copy of [`assets/svgs/obd-loading-indicator.svg`](../../assets/svgs/obd-loading-indicator.svg), imported by [`loadingicon.ts`](../../src/betterdiscord/loadingicon.ts). |
| [Outlined O/B logo](brand-obd-logo-accented.svg) · [PNG](brand-obd-logo-accented.png) | Applied as inline TSX paths; native validation pending | Reference copy for the accented `BDLogo` variant in [`logo.tsx`](../../src/betterdiscord/ui/logo.tsx); the SVG file itself is not imported. |
| [Monochrome OBD logo](brand-obd-logo-monochrome.svg) · [PNG](brand-obd-logo-monochrome.png) | Applied as inline TSX paths; native validation pending | Reference copy for `BDLogo` and `Logo.Discord` in [`logo.tsx`](../../src/betterdiscord/ui/logo.tsx); the SVG file itself is not imported. |

Both logo references reuse the loading mark's exact geometry, including its
signature O. The accented variant has transparent O and B interiors with thin
`currentColor` outlines; D has a `currentColor` fill. Its source stroke width is
`1.254` in the `1254` viewBox. The monochrome artwork fills all three paths with
`currentColor`.
PNG previews resolve `currentColor` to black; the SVG can inherit the surrounding
text color when embedded inline. The loading indicator retains its separate
red, blue, and white artwork.

See the [branding and UI map](../../docs/branding.md) for component and caller
details. When approved artwork changes in source, refresh its reference copy and
PNG preview together. README wordmarks are stored separately in the parent
directory.
