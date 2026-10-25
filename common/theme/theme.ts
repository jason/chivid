import type { PaletteMode } from '@mui/material/styles';
import { createTheme as createMuiTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

/**
 * Mandarin Edition design tokens (docs/mandarin-edition/DESIGN.md): warm neutrals, one accent,
 * hairline borders instead of shadows, 8px grid, 10px radius.
 */
export const mandarinTokens = {
    dark: {
        bg: '#16130f',
        bg2: '#1e1a16',
        surface: '#26211c',
        fg: '#ece2d6',
        fg2: '#a89c8e',
        fg3: '#6f655a',
        line: 'rgba(236, 226, 214, 0.12)',
        lineStrong: 'rgba(236, 226, 214, 0.24)',
        accent: '#d2543a',
        accentSoft: 'rgba(210, 84, 58, 0.16)',
        overlay: 'rgba(22, 19, 15, 0.72)',
    },
    light: {
        bg: '#f6f2ec',
        bg2: '#efe9e1',
        surface: '#ffffff',
        fg: '#241e18',
        fg2: '#6e6256',
        fg3: '#a2968a',
        line: 'rgba(40, 32, 24, 0.12)',
        lineStrong: 'rgba(40, 32, 24, 0.24)',
        accent: '#b8432b',
        accentSoft: 'rgba(184, 67, 43, 0.12)',
        overlay: 'rgba(246, 242, 236, 0.86)',
    },
} as const;

export const mandarinSans = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const mandarinCjk =
    '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

const stockTheme = (themeType: PaletteMode) =>
    createMuiTheme({
        palette: {
            primary: {
                main: '#ff3f78',
            },
            error: {
                main: red.A400,
            },
            background: {
                default: 'rgba(0, 0, 0, 0)',
            },
            mode: themeType,
        },
    });

const mandarinTheme = (themeType: PaletteMode) => {
    const t = mandarinTokens[themeType];
    return createMuiTheme({
        palette: {
            mode: themeType,
            primary: { main: t.accent },
            error: { main: red.A400 },
            // Pages and overlays keep upstream's transparent root; surfaces carry the color.
            background: { default: 'rgba(0, 0, 0, 0)', paper: t.surface },
            text: { primary: t.fg, secondary: t.fg2, disabled: t.fg3 },
            divider: t.line,
            action: { hover: t.accentSoft, selected: t.accentSoft },
        },
        shape: { borderRadius: 10 },
        typography: {
            fontFamily: `${mandarinSans.replace(', sans-serif', '')}, ${mandarinCjk}`,
            button: { textTransform: 'none', fontWeight: 600 },
        },
        components: {
            // Hairlines, not elevation: no MUI dark-mode tint or drop shadows on surfaces.
            MuiPaper: {
                defaultProps: { elevation: 0 },
                styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: t.line } },
            },
            MuiPopover: {
                styleOverrides: { paper: { border: `1px solid ${t.lineStrong}` } },
            },
            MuiMenu: {
                styleOverrides: { paper: { border: `1px solid ${t.lineStrong}` } },
            },
            MuiDialog: {
                styleOverrides: { paper: { border: `1px solid ${t.line}` } },
            },
            MuiButton: { defaultProps: { disableElevation: true } },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        backgroundColor: t.surface,
                        color: t.fg,
                        border: `1px solid ${t.lineStrong}`,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '4px 8px',
                    },
                    arrow: { color: t.surface },
                },
            },
            MuiDivider: { styleOverrides: { root: { borderColor: t.line } } },
        },
    });
};

/** Upstream's theme, or the Mandarin Edition's when the edition is on. */
export const createTheme = (themeType: PaletteMode, mandarinEdition = false) =>
    mandarinEdition ? mandarinTheme(themeType) : stockTheme(themeType);
