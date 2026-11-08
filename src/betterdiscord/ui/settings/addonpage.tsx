import React, {useCallback, useLayoutEffect, useRef, useState} from "react";
import AddonStorePage from "./addonstore";
import AddonList from "./addonlist";
import AddonSettingsPage, {type ResolvedAddonSettings} from "./addonsettings";
import {addonContext, addonText} from "./addonshared";
import AddonSettingsRoute from "@stores/addonsettings";
import SettingsStore from "@stores/settings";
import Modals from "@ui/modals";
import {useStateFromStores} from "@ui/hooks";
import {watchAddonSettingsUnload, type AddonSettingsOpening} from "@utils/addonsettingsmodal";
import type AddonManager from "@modules/addonmanager";
import type {Plugin} from "@modules/pluginmanager";

export default function AddonPage(props: {title: string; store: AddonManager; onDetachedOpen?: () => void;}) {
    const [showStore, setShowStore] = useState(() => !props.store.addonList.length);
    const [opened, setOpened] = useState<ResolvedAddonSettings | null>(null);
    const pending = useRef<AddonSettingsOpening | null>(null);
    const pendingStore = useStateFromStores([AddonSettingsRoute], () => AddonSettingsRoute.pendingStore === props.store.prefix);
    const request = useStateFromStores([AddonSettingsRoute], () => AddonSettingsRoute.request?.prefix === props.store.prefix ? AddonSettingsRoute.request : null);
    const toggleStore = useCallback(() => {
        pending.current?.cancel();
        setShowStore((value: boolean) => !value);
    }, []);
    const closeSettings = useCallback(() => setOpened(null), []);
    const showingStore = showStore || pendingStore;

    useLayoutEffect(() => () => {pending.current?.cancel();}, []);

    useLayoutEffect(() => {
        if (!pendingStore) return;
        pending.current?.cancel();
        setOpened(null);
        setShowStore(true);
        AddonSettingsRoute.consumeStore(props.store.prefix);
    }, [pendingStore, props.store.prefix]);

    useLayoutEffect(() => {
        if (!request) return;
        pending.current?.cancel();
        const addon = props.store.addonList.find(entry => entry.id === request.id) as Plugin | undefined;
        if (!addon || !props.store.isEnabled(request.id)) {
            AddonSettingsRoute.consumeSettings(request);
            return;
        }
        const instance = addon.instance;
        const location = SettingsStore.get<string>("settings", "addons", "settingsLocation") === "modal" ? "modal" : "page";
        let cancelled = false;
        let released = false;
        const unsubscribers: Array<() => void> = [];
        const ownerValid = () => {
            const current = props.store.addonList.find(entry => entry.id === request.id) as Plugin | undefined;
            return current === addon && current?.instance === instance && props.store.isEnabled(request.id);
        };
        const opening: AddonSettingsOpening = {
            isCurrent: () => !cancelled && (released || (AddonSettingsRoute.revision === request.revision && ownerValid())),
            release: () => {
                if (released) return;
                released = true;
                for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
                if (pending.current === opening) pending.current = null;
            },
            cancel: () => {cancelled = true; opening.release();}
        };
        pending.current = opening;
        const guard = () => {if (!opening.isCurrent()) opening.cancel();};
        const addGuard = (unsubscribe: () => void) => {
            if (released) unsubscribe();
            else unsubscribers.push(unsubscribe);
        };
        addGuard(watchAddonSettingsUnload({id: request.id, type: props.store.prefix}, () => opening.cancel()));
        addGuard(props.store.addChangeListener(guard));
        addGuard(AddonSettingsRoute.addChangeListener(guard));
        if (!opening.isCurrent() || !AddonSettingsRoute.consumeSettings(request) || !opening.isCurrent()) {opening.cancel(); return;}

        let result: unknown;
        let error: Error | null = null;
        try {
            const provider = instance?.getSettingsPanel;
            if (!opening.isCurrent()) {opening.cancel(); return;}
            if (typeof provider !== "function") throw new Error("No settings panel");
            result = provider.call(instance);
        }
        catch (err) {error = err instanceof Error ? err : new Error(String(err));}
        if (!opening.isCurrent()) {opening.cancel(); return;}
        if (!error && (location === "modal" || result == null)) {
            try {
                Modals.showAddonSettingsModal(addonText(addon.name), result as Parameters<typeof Modals.showAddonSettingsModal>[1], {id: request.id, type: props.store.prefix}, opening);
                return;
            }
            catch (err) {error = err instanceof Error ? err : new Error(String(err));}
            if (!opening.isCurrent()) {opening.cancel(); return;}
        }
        setOpened({addon, instance, result, error, opening, revision: request.revision});
        setShowStore(false);
    }, [request, props.store]);

    const closeOpened = useCallback((payload: ResolvedAddonSettings) => {
        setOpened(current => current === payload ? null : current);
    }, []);

    const closeCurrent = useCallback(() => {if (opened) closeOpened(opened);}, [opened, closeOpened]);

    return (
        <addonContext.Provider value={{toggleStore, closeSettings, showingStore, ...props}}>
            {opened ? <AddonSettingsPage key={opened.revision} payload={opened} onClose={closeCurrent} /> : showingStore ? (
                <AddonStorePage key="store" {...props} type={props.store.prefix} />
            ) : <AddonList key="list" {...props} />}
        </addonContext.Provider>
    );
}
