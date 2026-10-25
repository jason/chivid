import '@project/extension/src/ui/register-mandarin-fetcher';
import { renderSettingsUi } from '@/ui/settings';
import { configureExtensionLogProvider } from '@/services/extension-log-provider';

configureExtensionLogProvider();

window.addEventListener('load', () => {
    const root = document.getElementById('root')!;
    renderSettingsUi(root);
});
