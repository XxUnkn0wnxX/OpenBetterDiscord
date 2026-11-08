import Logger from "@common/logger";
import React, {useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {t} from "@common/i18n";
import {ChevronRightIcon} from "lucide-react";
import SimpleMarkdown from "@structs/markdown";
import Toasts from "@stores/toasts";
import Modals from "@ui/modals";
import ErrorBoundary from "@ui/errorboundary";
import Text from "@ui/base/text";
import Button from "@ui/base/button";
import SettingsStore from "@stores/settings";
import SettingsTitle from "@ui/settings/title";
import {useStateFromStores} from "@ui/hooks";
import {SettingsTitleContext} from "@ui/settings";
import {addonContext, addonText, authorByline} from "./addonshared";
import {watchAddonSettingsUnload} from "@utils/addonsettingsmodal";
import type {Plugin} from "@modules/pluginmanager";

function sameSnapshot(left: {addon: Plugin; instance: Plugin["instance"];} | null, right: {addon: Plugin; instance: Plugin["instance"];} | null) {
    return left?.addon === right?.addon && left?.instance === right?.instance;
}

export default function AddonSettingsPage({addonId}: {addonId: string;}) {
    const {title, store, closeSettings} = useContext(addonContext);
    const set = useContext(SettingsTitleContext);
    const [settingsLocation] = useState(() => SettingsStore.get<string>("settings", "addons", "settingsLocation") === "modal" ? "modal" : "page");
    const snapshot = useStateFromStores(store, () => {
        const addon = store.addonList.find(entry => entry.id === addonId) as Plugin | undefined;
        if (!addon) return null;
        return {addon, instance: addon.instance};
    }, [addonId], sameSnapshot);
    const owner = useRef(snapshot).current;
    const isOwned = Boolean(owner && sameSnapshot(owner, snapshot) && store.isEnabled(addonId));
    const rootRef = useRef<HTMLDivElement>(null);
    const closed = useRef(false);
    const legacyFallbackAttempted = useRef(false);
    const [fallbackError, setFallbackError] = useState<Error | null>(null);

    const close = useCallback(() => {
        if (closed.current) return;
        closed.current = true;
        closeSettings();
    }, [closeSettings]);

    const panel = useMemo<{result: unknown; content: ReactNode | null; error: Error | null;} | null>(() => {
        if (!owner || !isOwned) return null;
        const instance = owner.instance;
        if (!instance || typeof instance.getSettingsPanel !== "function") return {result: null, content: null, error: new Error("No settings panel")};
        try {
            const next = instance.getSettingsPanel();
            if (next == null || settingsLocation === "modal") return {result: next, content: null, error: null};
            return {result: next, content: Modals.createAddonSettingsContent(next), error: null};
        }
        catch (err) {
            return {result: null, content: null, error: err instanceof Error ? err : new Error(String(err))};
        }
    }, [owner, isOwned, settingsLocation]);

    const shouldOpenModal = settingsLocation === "modal" || panel?.result == null;

    useEffect(() => {
        if (!owner || !isOwned || !panel || panel.error || !shouldOpenModal || closed.current || legacyFallbackAttempted.current) return;
        legacyFallbackAttempted.current = true;

        const current = store.addonList.find(entry => entry.id === addonId) as Plugin | undefined;
        if (current !== owner.addon || current?.instance !== owner.instance || !store.isEnabled(addonId)) return;

        try {
            Modals.showAddonSettingsModal(addonText(owner.addon.name), panel.result as Parameters<typeof Modals.showAddonSettingsModal>[1], {id: addonId, type: store.prefix});
            close();
        }
        catch (err) {
            setFallbackError(err instanceof Error ? err : new Error(String(err)));
        }
    }, [addonId, close, isOwned, owner, panel, shouldOpenModal, store]);

    const titleName = isOwned && owner ? addonText(owner.addon.name) : null;

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const host = root.closest("[class*='contentColumn']") ?? root.closest("[class*='panel']");
        if (!(host instanceof HTMLElement)) return;
        host.classList.add("bd-addon-settings-host");
        return () => host.classList.remove("bd-addon-settings-host");
    }, [addonId]);

    useLayoutEffect(() => {
        if (titleName == null) return;
        set(
            <SettingsTitle
                key="title"
                text={(
                    <div className="bd-addon-title" data-showing-settings="true">
                        <span onClick={close}>{title}</span>
                        <span className="bd-addon-title-current">
                            <ChevronRightIcon size="24px" />
                            <span>{titleName}</span>
                        </span>
                    </div>
                )}
            />
        );
    }, [set, close, title, titleName]);

    useLayoutEffect(() => watchAddonSettingsUnload({id: addonId, type: store.prefix}, close), [addonId, store.prefix, close]);

    useLayoutEffect(() => {
        if (!isOwned) close();
    }, [isOwned, close]);

    useEffect(() => {
        const error = panel?.error ?? fallbackError;
        if (!error || titleName == null) return;
        Toasts.show(t("Addons.settingsError", {name: titleName}), {type: "error"});
        Logger.stacktrace("Addon Settings", "Unable to get settings panel for " + titleName + ".", error);
    }, [fallbackError, panel, titleName]);

    if (!isOwned || !owner) return null;

    const {addon} = owner;
    const name = addonText(addon.name);
    const version = addonText(addon.version);
    const author = addonText(addon.author);
    const description = addonText(addon.description);
    const authorNode = addon.authorLink
        ? <a className="bd-link bd-link-website" href={addon.authorLink} target="_blank" rel="noopener noreferrer">{author}</a>
        : <span>{author}</span>;

    return (
        <div ref={rootRef} className="bd-addon-settings">
            <div className="bd-addon-settings-intro">
                <Button size={Button.Sizes.SMALL} look={Button.Looks.LINK} grow={false} onClick={close}>
                    <ChevronRightIcon size="16px" style={{transform: "rotate(180deg)"}} /> {t("Paginator.back")}
                </Button>
                <div className="bd-addon-settings-heading">
                    <span className="bd-addon-settings-name">{name}</span>
                    {version && <span className="bd-addon-settings-version">v{version}</span>}
                    {author && <span className="bd-addon-settings-author">{authorByline(authorNode)}</span>}
                </div>
                {description && <div className="bd-description bd-addon-settings-description">{SimpleMarkdown.parseToReact(description)}</div>}
            </div>
            <div className="bd-addon-settings-panel">
                {panel?.error || fallbackError
                    ? <Text color={Text.Colors.STATUS_RED}>{t("Addons.settingsError", {name})}</Text>
                    : <ErrorBoundary id={`addon-settings-${addon.id}`} name="Addon Settings">{panel?.content}</ErrorBoundary>}
            </div>
        </div>
    );
}
