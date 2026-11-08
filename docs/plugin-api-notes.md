# Optional Open BetterDiscord Plugin APIs

Optional APIs that can simplify plugin code, documented separately from the
fork's implementation contracts. Availability below is verified against this
checkout, not inferred from a version number.

**On this page:** [Component rerendering](#bdapireactutilsrerendercomponent) · [Addon settings](#addon-settings-navigation) · [Tables and dropdowns](#table-settings-and-dropdown-inputs) · [Typed `getById`](#typed-bdapiwebpackgetbyid) · [`byDestructure`](#bdapiwebpackfiltersbydestructure) · [`loadEntry`](#bdapiutilsloadentry) · [Maintaining these notes](#keeping-these-notes-current)

| API | Availability in this checkout | What it is for |
| --- | --- | --- |
| `BdApi.Utils.loadEntry` | Present on `develop`; this fork includes an internal compatibility fallback for older runtimes. | Load entry modules referenced by a discovered lazy Webpack loader. |
| `BdApi.Webpack.Filters.byDestructure` | Present on `develop` from the 1.14.3 adaptation; live audit passed on Stable with Electron 37.6.0. | Find exported functions whose source contains a matching destructuring assignment. |
| `BdApi.Webpack.getById<T>()` | Generic typing adopted from upstream 1.14.4; the existing runtime method is unchanged. | Describe the expected result of an ID lookup in TypeScript. |
| `BdApi.Components.TableInput` and `buildSettingsPanel` table settings | Added on `develop` during the 1.14.6 adaptation. Focused source tests pass; native audit is pending after the final release build. | Edit an array of row objects with typed columns and row operations. |
| `BdApi.Components.DropdownInput` search and multiple modes | Adopted with 1.14.6 table support; existing single-value mode remains supported. Native positioning and interaction checks are pending. | Filter choices and select multiple values. |
| `BdApi.Plugins.openSettings` / `BdApi.Themes.openSettings` | Added during the 1.14.6 full-page settings adaptation. Focused source checks cover enabled-state and routing; native audit is pending. | Navigate to an enabled addon's existing settings panel. |
| `BdApi.ReactUtils.rerenderComponent` | Adopted from upstream 1.14.6. The API and private scheduler discovery are present; real-client scheduler discovery and a harmless render consumer still require the final native audit. | Apply a component patch or unpatch to matching mounted fibers. |

## `BdApi.ReactUtils.rerenderComponent`

After patching or unpatching an inspected React component export, request a
refresh of its mounted instances:

```js
function refreshMountedExport(verifiedModule, key) {
    if (typeof BdApi.ReactUtils.rerenderComponent !== "function") return;
    if (typeof verifiedModule?.[key] !== "function") return;
    BdApi.ReactUtils.rerenderComponent([verifiedModule, key]);
}
```

Discover and validate the actual component before patching it. Call the helper
after applying a patch and again after unpatching if the mounted UI needs to
reflect that change. It also accepts a function directly and an optional
`(fiber) => boolean` predicate to restrict matching instances. The upstream
implementation follows patched-function identity through `__originalFunction`;
plugins should not create or alter that internal property themselves.

The method returns `void`, rather than a count or completion promise. It scans
the current `app-mount` React root and depends on Discord's private reconciler
exports to queue and schedule updates on the same lane. Missing roots and
non-function inputs do nothing. When scheduler discovery is unavailable, the
upstream helper does not schedule a render, but still replaces matching fiber
type references before checking that capability. It is not a general DOM
rerender command or a guarantee that a private Discord component is compatible.

Focused real-API fixtures cover direct/module-key input, traversal and filtering,
patch/unpatch identity, alternates, scheduling and missing capabilities. Existing
optional recovery-stack discovery remains intact. A supported-client audit must
still verify both scheduler exports and a gentle mounted consumer through patch,
refresh, unpatch and refresh; native success is pending.

## Addon settings navigation

Use the manager's `openSettings(idOrFile)` method with an installed addon's name,
ID or filename. Keep the method's receiver:

```js
if (typeof BdApi.Plugins.openSettings === "function") {
    const opened = BdApi.Plugins.openSettings("ExamplePlugin");
    if (!opened) console.log("No enabled settings panel is available.");
}
```

It returns `true` after queuing the settings route and opening the category, or
`false` when the addon is missing, disabled or has no callable `getSettingsPanel`
on its current instance. Disabled and panel-less addons also show the upstream
warning. It does not enable, start or evaluate an addon to obtain a panel. The
same method exists on `BdApi.Themes`; themes without a settings provider return
`false`. Panel construction happens when the page renders, so `true` does not
guarantee that the provider later returns valid content.

Existing DOM, string, function and React panel results remain supported, and the
provider retains its instance receiver. Matching unload or loss of the opened
instance exits the page without evaluating its replacement. The fork's modal
unload protection, controlled search/title behavior and detached-editor focus
contracts remain internal adaptations; plugins need no alternate public API.

Focused fixtures cover API guards, route subscriptions, panel content and owned
unload. The final-release audit on a supported older client must still exercise
real Settings-menu/card/API navigation, panel interaction, unload/reload, and the
existing search/title/editor paths. Those native checks remain pending.

## Table settings and dropdown inputs

`BdApi.UI.buildSettingsPanel` accepts a `table` setting with an array of row
objects and `columns`, supplied as an ID-keyed object or an ordered array of
column definitions with IDs:

```js
const panel = BdApi.UI.buildSettingsPanel({
    settings: [{
        type: "table",
        id: "rules",
        name: "Rules",
        value: [{enabled: true, label: "Example"}],
        columns: {
            enabled: {type: "switch", label: "Enabled", default: true},
            label: {type: "string", label: "Label", enableWith: "enabled"}
        }
    }],
    onChange: (_category, settingId, rows) => {
        // Persist rows through the plugin's own settings/data path.
        console.log(settingId, rows);
    }
});
// Return panel from the plugin's getSettingsPanel().
```

Column types are `string`, `array`, `boolean`, `switch`, `dropdown` and
`multiselect`. A column's `enableWith` refers to another boolean field in the
same row. Dropdown options use `{label, value}`, with optional HTTPS icons and
`search: true`; multiselect cells store arrays of selected values. Users can
add, duplicate, delete and reorder rows. A change reports the new row array;
individual-setting callbacks still run before the panel callback, once each.

For a standalone control, use `BdApi.Components.TableInput` with `columns` and
either controlled `value` or an initial `defaultValue`, plus `onChange`.
`DropdownInput` also accepts `multiple` and `search`; single-value changes stay
scalar, while multiple mode returns an array in option order. These are upstream
contracts; no fork-only alternate API or plugin migration is introduced.

The fork uses explicit React context providers for its Electron 35.x–37.x
compatibility target and preserves provider/local disabled handling. Focused
fixtures cover row operations, dependencies, callback order, multiple selection
and options arriving after an empty list. Those fixtures do not prove native
popover positioning, dragging or operation on every supported client. The
final-release older-client audit remains pending; handle availability when
supporting upstream BetterDiscord versions without these optional additions.

## Typed `BdApi.Webpack.getById`

TypeScript plugins can supply the shape they expect from an existing module ID:

```ts
type ExpectedModule = {getValue(): string};
const module = BdApi.Webpack.getById<ExpectedModule>(verifiedModuleId);
if (module) console.log(module.getValue());
```

`verifiedModuleId` must come from inspection of the target Discord build; module
IDs can change. The generic is erased and does not validate an export's shape
or load a missing module. With `raw: true`, describe the raw module object
instead of its exports. Missing lookups and invalid arguments retain the
existing empty result; `fatal: true` retains the existing throwing behavior.
This addition changes declarations only and needs no new native capability.
Source/declaration checks and native runtime evidence remain separate.

## `BdApi.Webpack.Filters.byDestructure`

This filter accepts one or more property names and returns a predicate for
`BdApi.Webpack.getModule` or related Webpack searches. The [reviewed upstream
implementation](https://github.com/BetterDiscord/BetterDiscord/blob/3eafabae8c4ccc28aeb2ff97239f757ee87cbe17/src/betterdiscord/webpack/filter.ts)
checks function source for `}=` groups, takes the nearest
preceding `{`, splits the group on commas and `:`/`=`, and checks that every
requested name appears in the same group.

For example, a function containing `({channelId: c, guildId: g}=props)` can
match both names:

```js
const {Filters, getModule} = BdApi.Webpack;
if (typeof Filters.byDestructure === "function") {
    const filter = Filters.byDestructure("channelId", "guildId");
    const matchedExport = getModule(filter, {searchExports: true});
    // Inspect matchedExport before using it; these property names are illustrative.
}
```

This is a source-text heuristic, not a JavaScript parser. It does not match
ordinary function-parameter destructuring such as `function ({channelId}) {}`;
the source must contain the implementation's `}=` marker. Formatting and
minification can affect the result. Use it as a convenient search filter, then
check that the returned export has the behavior your plugin needs.

### Practical uses

Property names are illustrative. Inspect the target function on the client;
matching common properties alone does not identify the right export.

| Use | Example | Check |
| --- | --- | --- |
| Find a React component | Search for `message` and `compact` extracted from props. | Verify the returned component; channel and member components need their own characteristic props. |
| Find a handler or utility | Search for `channelId` and `guildId` in options. | Aliases such as `channel` and `guild` do not change the matched property names. |
| Repair a lookup after Discord updates | A verified property pair may still find a renamed function. | Recheck its source and behavior; its properties or responsibilities may change. |
| Narrow a broad search | Combine with a source-string or another filter. | `Filters.combine(...)` requires every filter to match. |

For example, a combined lookup can distinguish message-related components:

```js
const {Filters, getModule} = BdApi.Webpack;
if (typeof Filters.byDestructure === "function") {
    const candidate = getModule(Filters.combine(
        Filters.byDestructure("message", "compact"),
        Filters.byStrings("your-verified-source-marker")
    ), {searchExports: true});
    // Handle an absent match and verify candidate before calling or patching it.
}
```

Replace `your-verified-source-marker` with a distinctive literal from the
intended function's inspected source. This pattern does not identify a
particular component. Discovery does not call or modify the match or load
missing chunks.

### Compatibility evidence

The implementation uses ordinary JavaScript string and array operations; it
does not depend on `Map.prototype.getOrInsertComputed` or browser/Electron
APIs. Its operations are already available to the fork's older Electron targets;
no new engine fallback is needed. Focused checks exercise the upstream matching
semantics and public API on pinned Bun 1.1.20.

A temporary live audit on 2026-10-14 (Melbourne), using this fork’s 1.14.3 build
from `91b26615` on Discord Stable with Electron 37.6.0 / Chromium 138.0.7204.251,
passed twice: seven source-pattern checks per run, three verified cached-export
matches (`children`, `channelId`, `guildId`), and zero lookup errors. It did not
call matched functions or force-load chunks. This establishes operation on that
client, not the identity or behavior of every potential plugin target. Recheck
the source shape on other clients and handle an absent match.

## `BdApi.Utils.loadEntry`

The fork exposes this helper in [`BdApi.Utils`](../src/betterdiscord/api/utils.ts)
and implements it in [`webpack/lazy.ts`](../src/betterdiscord/webpack/lazy.ts).
`loadEntry(loader)` takes a function or source string for an actual discovered
lazy Webpack loader. It recognizes the supported `Promise.all([...]).then(...)`
chunk-loader shape, loads eligible chunks, and returns an array of entry
module exports. It is not a general URL importer, a chunk-ID lookup, or a
replacement for discovering the loader in the current Discord build.

**This helper is opt-in.** Open BetterDiscord does not scan for or load lazy entries
automatically. A plugin calls `loadEntry` when it needs the exports associated
with a verified loader.

Pass a loader found through a verified Webpack query; do not copy an example
module ID and assume it is stable across Discord builds. Keep loading on a
plugin action or setup path where appropriate, rather than repeating it during
every render:

```js
async function loadFeatureEntries(discoveredLoader) {
    if (typeof BdApi.Utils.loadEntry !== "function") return [];
    if (typeof discoveredLoader !== "function") return [];

    try {
        const entries = await BdApi.Utils.loadEntry(discoveredLoader);
        if (entries === null || entries.length === 0) return [];
        return entries;
    }
    catch (error) {
        console.error("Could not load the feature entries", error);
        return [];
    }
}
```

`null` means the input was empty or its source did not match a supported lazy
loader pattern. An empty array means no entry exports were loaded. Chunk or
module loading can reject, so callers should handle errors. The helper skips
chunk files identified as workers and caches its worker check internally.

This fork preserves the upstream input and result contract. Internally, it uses
`Map.prototype.getOrInsertComputed` when available and a private fallback when
not; it does not patch `Map.prototype` or add another plugin-facing API.

The 1.14.3 adaptation leaves both this helper and its compatibility patch
unchanged. Prior runtime validation remains applicable to that unchanged code;
the new `byDestructure` audit did not retest `loadEntry` or alter its behavior.

`BdApi.Utils.loadEntry` is unrelated to the removed legacy plugin-instance
`load()` lifecycle callback. Use the lifecycle contract supported by the host;
these APIs are not interchangeable.

## Keeping these notes current

When reviewing another optional upstream plugin API, add its purpose, a small
verified example, practical use cases, and its exact branch availability here.
Every newly adopted optional API or feature needs a focused audit on the
supported older client even when no installed plugin uses it; use a temporary
audit plugin when needed. Record source checks and native runtime evidence
separately, with tested runtime versions and any unavailable paths. Reuse prior
evidence for unchanged helpers and repeat affected checks when their behavior
or runtime capabilities change. Keep this as a plugin-development quick
reference, not a second fork-contract ledger.
