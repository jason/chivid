import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/Download';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NoWrapButton from '@project/common/components/NoWrapButton';
import SettingsSection from '@project/common/components/SettingsSection';
import SwitchLabelWithHoverEffect from '@project/common/components/SwitchLabelWithHoverEffect';
import { LedgerRepository } from '@project/common/mandarin/ledger';
import { download, getCurrentTimeString } from '@project/common/util';
import { asbError } from '@project/common/util/log';

interface Props {
    readonly enabled: boolean;
    readonly onEnabledChanged: (enabled: boolean) => void;
    /** Only the extension's own settings page can read the ledger, which lives in the extension's storage. */
    readonly canExportLedger: boolean;
}

export default function MandarinSettingsSection({ enabled, onEnabledChanged, canExportLedger }: Props) {
    const { t } = useTranslation();
    const [exportState, setExportState] = useState<'idle' | 'empty' | 'failed'>('idle');

    const handleExportLedger = useCallback(async () => {
        try {
            const jsonl = await new LedgerRepository().exportJsonl();
            if (jsonl.length === 0) {
                setExportState('empty');
                return;
            }
            download(
                new Blob([jsonl], { type: 'application/x-ndjson' }),
                `mandarin-ledger-${getCurrentTimeString()}.jsonl`
            );
            setExportState('idle');
        } catch (error) {
            asbError('mandarin', 'Failed to export learning ledger:', error);
            setExportState('failed');
        }
    }, []);

    return (
        <>
            <SettingsSection>{t('mandarin.settingsTitle')}</SettingsSection>
            <SwitchLabelWithHoverEffect
                control={<Switch checked={enabled} onChange={() => onEnabledChanged(!enabled)} />}
                label={t('mandarin.enable')}
                labelPlacement="start"
            />
            <Typography variant="caption" color="textSecondary">
                {t('mandarin.enableHelp')}
            </Typography>
            {canExportLedger && (
                <>
                    <NoWrapButton
                        size="small"
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() => void handleExportLedger()}
                    >
                        {t('mandarin.exportLedger')}
                    </NoWrapButton>
                    {exportState !== 'idle' && (
                        <Typography variant="caption" color={exportState === 'failed' ? 'error' : 'textSecondary'}>
                            {t(exportState === 'failed' ? 'mandarin.exportFailed' : 'mandarin.ledgerEmpty')}
                        </Typography>
                    )}
                </>
            )}
        </>
    );
}
