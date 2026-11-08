import {expect, test} from "bun:test";
import i18n from "../../../src/common/i18n";

test("localized update failures fall back to the fork release guidance", () => {
    for (const locale of i18n.supportedLocales) {
        i18n.setLocale(locale as typeof i18n.locale);
        const message = i18n.t("Updater.updateFailedMessage");
        expect(message).toContain("Open BetterDiscord");
        expect(message).toContain("github.com/XxUnkn0wnxX/OpenBetterDiscord");
        expect(message).not.toContain("betterdiscord.app");
    }
});
