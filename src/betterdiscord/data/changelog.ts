import config from "@stores/config";
import type {ChangelogProps} from "@ui/modals/changelog";

// fixed, improved, added, progress
export default {
    title: "Open BetterDiscord",
    subtitle: `v${config.get("version")}`,
    // https://youtu.be/BZq1eb9d0HI?si=67V2eArlF4atnGnz
    video: "https://www.youtube.com/embed/Qv1HUqqUgkg?si=67V2eArlF4atnGnz&vq=hd720p&hd=1&rel=0&showinfo=0&mute=0&loop=1&autohide=1",
    // banner: "https://i.imgur.com/wuh5yMK.png",
    blurb: "Open BetterDiscord 1.14.6 brings upstream settings improvements while retaining this fork's client compatibility and addon policies.",
    changes: [
        {
            type: "added",
            title: "Upstream Settings Improvements",
            items: [
                "Plugin settings now open in a full page",
                "Plugin authors can use table settings and searchable, multiple-selection dropdowns"
            ]
        },
        {
            type: "added",
            title: "Mounted Component Refresh",
            items: [
                "Adds the optional BdApi.ReactUtils.rerenderComponent helper for component patches and unpatches"
            ]
        },
        {
            type: "improved",
            title: "Open BetterDiscord",
            items: [
                "Updates the fork's UI and report branding with new loading artwork",
                "Retains custom addon updates, provider tokens and disabled-means-disabled plugin loading"
            ]
        },
        {
            type: "fixed",
            title: "Sidebar Diagnostics",
            items: [
                "Restores the version and addon-count block for Discord's changed footer classes",
                "Preserves full debug-report copy and feedback"
            ]
        },
        {
            type: "improved",
            title: "Older Client Compatibility",
            items: [
                "Keeps the macOS Big Sur backport and Electron 35.x–37.x targets",
                "Preserves macOS recovery, OpenAsar coordination and editor-focus behavior"
            ]
        }
    ]
} as ChangelogProps;
