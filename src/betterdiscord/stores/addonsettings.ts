import Store from "@stores/base";
import type {AddonType} from "@typed/addon";

export interface AddonSettingsRequest {prefix: AddonType; id: string; revision: number;}

class AddonSettingsRoute extends Store {
    revision = 0;
    request: AddonSettingsRequest | null = null;
    prefix: AddonType | null = null;
    id: string | null = null;
    pendingStore: AddonType | null = null;

    open(prefix: AddonType, id: string) {
        this.request = {prefix, id, revision: ++this.revision};
        this.prefix = prefix;
        this.id = id;
        this.pendingStore = null;
        this.emitChange();
    }

    close() {
        ++this.revision;
        this.request = null;
        this.prefix = null;
        this.id = null;
        this.emitChange();
    }

    consumeSettings(request: AddonSettingsRequest) {
        if (this.request !== request) return false;
        this.request = null;
        this.prefix = null;
        this.id = null;
        this.emitChange();
        return true;
    }

    openStore(prefix: AddonType) {
        ++this.revision;
        this.request = null;
        this.prefix = null;
        this.id = null;
        this.pendingStore = prefix;
        this.emitChange();
    }

    consumeStore(prefix: AddonType) {
        if (this.pendingStore !== prefix) return;
        this.pendingStore = null;
        this.emitChange();
    }
}

export default new AddonSettingsRoute();
