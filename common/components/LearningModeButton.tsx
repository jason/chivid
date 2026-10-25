import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import SvgIcon from '@mui/material/SvgIcon';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import Tooltip from '@project/common/components/Tooltip';
import { mandarinRecipeId } from '@project/common/mandarin/recipes';
import type { MandarinRecipeId } from '@project/common/mandarin/recipes';
import type { Recipe } from '@project/common/settings';

/** Accent from the Mandarin Edition reference page (dark theme), used only for "a mode is on". */
export const learningModeAccent = '#d2543a';
const learningModeAccentSoft = 'rgba(210, 84, 58, 0.16)';

const strokeIcon = (paths: React.ReactNode) =>
    function StrokeIcon(props: SvgIconProps) {
        return (
            <SvgIcon
                {...props}
                viewBox="0 0 24 24"
                sx={{
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 1.5,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    ...props.sx,
                }}
            >
                {paths}
            </SvgIcon>
        );
    };

// Lucide-style glyphs, one per mode, so the active mode is readable without words.
export const SlidersGlyph = strokeIcon(
    <>
        <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
        <circle cx="15" cy="6" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="17" cy="18" r="2" />
    </>
);
export const EyeGlyph = strokeIcon(
    <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </>
);
export const EarGlyph = strokeIcon(
    <>
        <path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" />
        <path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" />
    </>
);
export const EarPauseGlyph = strokeIcon(
    <>
        <path d="M4 8a5.5 5.5 0 1 1 11 0c0 5-5 5-5 8.5a3 3 0 1 1-6 0" />
        <path d="M12 8a2 2 0 0 0-4 0v.8a1.7 1.7 0 1 1 0 3.4" />
        <path d="M18 14v6M21.5 14v6" />
    </>
);

const glyphFor = (id: MandarinRecipeId | undefined) => {
    switch (id) {
        case 'justWatch':
            return EyeGlyph;
        case 'ears':
            return EarGlyph;
        case 'listenFirst':
            return EarPauseGlyph;
        default:
            return SlidersGlyph;
    }
};

interface Props {
    readonly recipes: readonly Recipe[];
    readonly activeRecipeId: number | null | undefined;
    readonly onRecipeSelected: (index: number | null) => void;
    /** The key that cycles to the next recipe, shown in the tooltip when bound. */
    readonly cycleKeys?: string;
    readonly disabled?: boolean;
    /** Called when the menu opens or closes, with the number of rows it shows. */
    readonly onMenuOpenChange?: (open: boolean, rows: number) => void;
    readonly tooltipProps?: Omit<React.ComponentProps<typeof Tooltip>, 'title' | 'children'>;
}

/**
 * Mandarin Edition mode button: shows the active recipe as its own icon, names it in the
 * tooltip and the accessible label, and opens a vertical list of Off plus every recipe.
 */
export default function LearningModeButton({
    recipes,
    activeRecipeId,
    onRecipeSelected,
    cycleKeys,
    disabled,
    onMenuOpenChange,
    tooltipProps,
}: Props) {
    const { t } = useTranslation();
    const anchorRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const active = activeRecipeId == null ? undefined : recipes[activeRecipeId];
    const Glyph = glyphFor(mandarinRecipeId(active));
    const name = active?.name ?? t('mandarin.modeOff');
    const title = cycleKeys
        ? `${t('mandarin.modeTooltip', { name })} · ${t('mandarin.nextMode', { key: cycleKeys })}`
        : t('mandarin.modeTooltip', { name });

    const setMenuOpen = (next: boolean) => {
        setOpen(next);
        onMenuOpenChange?.(next, recipes.length + 1);
    };

    const select = (index: number | null) => {
        setMenuOpen(false);
        if (index !== (activeRecipeId ?? null)) onRecipeSelected(index);
    };

    return (
        <>
            <Tooltip {...tooltipProps} title={title}>
                <span>
                    <IconButton
                        ref={anchorRef}
                        aria-label={title}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        data-learning-mode={mandarinRecipeId(active) ?? (active ? 'custom' : 'off')}
                        disabled={disabled}
                        onClick={() => setMenuOpen(true)}
                        sx={{
                            borderRadius: '8px',
                            color: active ? learningModeAccent : 'rgba(236, 226, 214, 0.75)',
                            backgroundColor: active ? learningModeAccentSoft : 'transparent',
                            '&:hover': { backgroundColor: learningModeAccentSoft },
                        }}
                    >
                        <Glyph fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={anchorRef.current}
                open={open}
                onClose={() => setMenuOpen(false)}
                MenuListProps={{ dense: true, 'aria-label': t('controls.playbackMode') }}
                slotProps={{ paper: { sx: { minWidth: 200, borderRadius: '10px', textAlign: 'left' } } }}
            >
                <MenuItem
                    role="menuitemradio"
                    aria-checked={active === undefined}
                    selected={active === undefined}
                    onClick={() => select(null)}
                >
                    <ListItemIcon>
                        <SlidersGlyph fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('mandarin.modeOff')}</ListItemText>
                </MenuItem>
                {recipes.map((recipe, index) => {
                    const RecipeGlyph = glyphFor(mandarinRecipeId(recipe));
                    const checked = index === activeRecipeId;
                    return (
                        <MenuItem
                            key={`${index}-${recipe.name}`}
                            role="menuitemradio"
                            aria-checked={checked}
                            selected={checked}
                            onClick={() => select(index)}
                        >
                            <ListItemIcon sx={checked ? { color: learningModeAccent } : undefined}>
                                <RecipeGlyph fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>{recipe.name}</ListItemText>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}
