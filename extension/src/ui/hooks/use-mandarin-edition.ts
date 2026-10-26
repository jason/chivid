import { useEffect, useState } from 'react';
import { SettingsProvider } from '@project/common/settings';
import { ExtensionSettingsStorage } from '@/services/extension-settings-storage';
import { asbError } from '@project/common/util/log';

const editionClass = 'asbplayer-mandarin';

/** The video page's body, when this UI is an about:blank frame the content script made there. */
const hostBody = (): HTMLElement | undefined => {
    try {
        if (window.parent === window) return undefined;
        return window.parent.document.body ?? undefined;
    } catch {
        return undefined; // Cross-origin parent: this is an extension page.
    }
};

/**
 * Whether the Mandarin Edition is on, for dialogs and notifications that receive only a theme
 * type from their controller. Frames on the video page follow the page's edition class (they
 * have no extension storage); extension pages read and follow the setting.
 */
export const useMandarinEdition = (): boolean => {
    const [enabled, setEnabled] = useState(() => hostBody()?.classList.contains(editionClass) ?? false);
    useEffect(() => {
        const body = hostBody();
        if (body) {
            const refresh = () => setEnabled(body.classList.contains(editionClass));
            const observer = new MutationObserver(refresh);
            observer.observe(body, { attributes: true, attributeFilter: ['class'] });
            refresh();
            return () => observer.disconnect();
        }

        const storage = typeof browser === 'undefined' ? undefined : browser.storage?.local;
        if (!storage) return;
        const settings = new SettingsProvider(new ExtensionSettingsStorage(storage));
        const refresh = () =>
            void settings
                .getSingle('mandarinEditionEnabled')
                .then(setEnabled)
                .catch((error) => asbError('mandarin', 'Failed to read the edition setting:', error));
        refresh();
        storage.onChanged.addListener(refresh);
        return () => storage.onChanged.removeListener(refresh);
    }, []);
    return enabled;
};
