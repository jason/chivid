import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/Download';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NoWrapButton from '@project/common/components/NoWrapButton';
import SettingsSection from '@project/common/components/SettingsSection';
import SwitchLabelWithHoverEffect from '@project/common/components/SwitchLabelWithHoverEffect';
import { LedgerRepository } from '@project/common/mandarin/ledger';
import {
    hskCharactersThrough,
    hskLevelCount,
    mergeKnownCharacters,
    parseKnownCharacters,
} from '@project/common/mandarin/known-characters';
import { download, getCurrentTimeString } from '@project/common/util';
import { asbError } from '@project/common/util/log';

interface Props {
    readonly enabled: boolean;
    readonly onEnabledChanged: (enabled: boolean) => void;
    /** Only the extension's own settings page can read the ledger, which lives in the extension's storage. */
    readonly canExportLedger: boolean;
    /** Characters the learner reads without help; pinyin is not shown over them. */
    readonly knownCharacters: string;
    readonly onKnownCharactersChanged: (chars: string) => void;
}

const hskLevelLabel = (level: number) => (level === hskLevelCount ? `HSK ${level}–9` : `HSK ${level}`);

export default function MandarinSettingsSection({
    enabled,
    onEnabledChanged,
    canExportLedger,
    knownCharacters,
    onKnownCharactersChanged,
}: Props) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(knownCharacters);
    useEffect(() => setDraft(knownCharacters), [knownCharacters]);
    const count = [...knownCharacters].length;

    const commitDraft = () => {
        const parsed = parseKnownCharacters(draft);
        setDraft(parsed);
        if (parsed !== knownCharacters) onKnownCharactersChanged(parsed);
    };
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
            {enabled && (
                <Stack spacing={1}>
                    <TextField
                        label={t('mandarin.knownCharacters', { count })}
                        helperText={t('mandarin.knownCharactersHelp')}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitDraft}
                        multiline
                        minRows={2}
                        maxRows={6}
                        size="small"
                        slotProps={{ htmlInput: { lang: 'zh-CN', 'data-testid': 'mandarin-known-characters' } }}
                    />
                    <TextField
                        select
                        size="small"
                        label={t('mandarin.addHskLevel')}
                        value=""
                        onChange={(e) =>
                            onKnownCharactersChanged(
                                mergeKnownCharacters(knownCharacters, hskCharactersThrough(Number(e.target.value)))
                            )
                        }
                        slotProps={{ htmlInput: { 'data-testid': 'mandarin-add-hsk' } }}
                    >
                        {Array.from({ length: hskLevelCount }, (_, i) => i + 1).map((level) => (
                            <MenuItem key={level} value={String(level)}>
                                {t('mandarin.throughLevel', { level: hskLevelLabel(level) })}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>
            )}
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
