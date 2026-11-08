import Logger from "@common/logger";
import React, {useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode} from "react";
import {t} from "@common/i18n";
import {ChevronRightIcon} from "lucide-react";
import SimpleMarkdown from "@structs/markdown";
import Toasts from "@stores/toasts";
import Modals from "@ui/modals";
import ErrorBoundary from "@ui/errorboundary";
import Text from "@ui/base/text";
import SettingsTitle from "@ui/settings/title";
import {useStateFromStores} from "@ui/hooks";
import {SettingsTitleContext} from "@ui/settings";
import {addonContext, addonText, authorByline} from "./addonshared";
import {watchAddonSettingsUnload, type AddonSettingsOpening} from "@utils/addonsettingsmodal";
import type {Plugin} from "@modules/pluginmanager";

export interface ResolvedAddonSettings {
    addon: Plugin;
    instance: Plugin["instance"];
    result: unknown;
    error: Error | null;
    opening: AddonSettingsOpening;
    revision: number;
}

type Snapshot = {addon: Plugin; instance: Plugin["instance"]; enabled: boolean;} | null;
function sameSnapshot(left: Snapshot, right: Snapshot) {
    return left?.addon === right?.addon && left?.instance === right?.instance && left?.enabled === right?.enabled;
}

export default function AddonSettingsPage({payload, onClose}: {payload: ResolvedAddonSettings; onClose(): void;}) {
    const {title, store} = useContext(addonContext);
    const set = useContext(SettingsTitleContext);
    const {addon, instance, opening} = payload;
    const addonId = addon.id;
    const snapshot = useStateFromStores(store, () => {
        const current = store.addonList.find(entry => entry.id === addonId) as Plugin | undefined;
        if (!current) return null;
        return {addon: current, instance: current.instance, enabled: store.isEnabled(addonId)};
    }, [addonId], sameSnapshot);
    const owner = {addon, instance};
    const isOwned = Boolean(snapshot && snapshot.addon === addon && snapshot.instance === instance && snapshot.enabled && opening.isCurrent());
    const rootRef = useRef<HTMLDivElement>(null);
    const closed = useRef(false);
    const close = useCallback(() => {
        if (closed.current) return;
        closed.current = true;
        onClose();
    }, [onClose]);
    const panel = useMemo<{content: ReactNode | null; error: Error | null;}>(() => {
        if (payload.error) return {content: null, error: payload.error};
        try {return {content: Modals.createAddonSettingsContent(payload.result as Parameters<typeof Modals.createAddonSettingsContent>[0]), error: null};}
        catch (err) {return {content: null, error: err instanceof Error ? err : new Error(String(err))};}
    }, [payload]);

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
                        <button type="button" className="bd-addon-settings-back" onClick={close} aria-label={t("Paginator.back")} title={t("Paginator.back")}>
                            <ChevronRightIcon size="24px" style={{transform: "rotate(180deg)"}} />
                            <span>{t("Paginator.back")}</span>
                        </button>
                        <span className="bd-addon-title-home" onClick={close}>{title}</span>
                        <span className="bd-addon-title-current">
                            <ChevronRightIcon size="24px" />
                            <span>{titleName}</span>
                        </span>
                    </div>
                )}
            />
        );
    }, [set, close, title, titleName]);

    useLayoutEffect(() => {
        const unwatch = watchAddonSettingsUnload({id: addonId, type: store.prefix}, close);
        if (!opening.isCurrent()) close();
        opening.release();
        return unwatch;
    }, [addonId, store.prefix, close, opening]);

    useLayoutEffect(() => {
        if (!isOwned) close();
    }, [isOwned, close]);

    useEffect(() => {
        const error = panel.error;
        if (!error || titleName == null) return;
        Toasts.show(t("Addons.settingsError", {name: titleName}), {type: "error"});
        Logger.stacktrace("Addon Settings", "Unable to get settings panel for " + titleName + ".", error);
    }, [panel, titleName]);

    if (!isOwned || !owner) return null;

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
                <div className="bd-addon-settings-heading">
                    <span className="bd-addon-settings-name">{name}</span>
                    {version && <span className="bd-addon-settings-version">v{version}</span>}
                    {author && <span className="bd-addon-settings-author">{authorByline(authorNode)}</span>}
                </div>
                {description && <div className="bd-description bd-addon-settings-description">{SimpleMarkdown.parseToReact(description)}</div>}
            </div>
            <div className="bd-addon-settings-panel">
                {panel.error
                    ? <Text color={Text.Colors.STATUS_RED}>{t("Addons.settingsError", {name})}</Text>
                    : <ErrorBoundary id={`addon-settings-${addon.id}`} name="Addon Settings">{panel.content}</ErrorBoundary>}
            </div>
        </div>
    );
}
