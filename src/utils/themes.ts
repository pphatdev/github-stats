import { Theme, BadgeTheme } from '../types.js';
import { baseThemes } from './themes/base.js';
import { graphThemes } from './themes/graph.js';
import { badgeThemes } from './themes/badge.js';

const defaultFontName = 'Orbitron';
const defaultFontFamily = `'${defaultFontName}', 'Ubuntu', 'sans-serif'`;
const defaultFontUrl = '/fonts/orbitron.woff2';

export const themes: { [key: string]: Theme } = { ...baseThemes, ...graphThemes };
export { badgeThemes };

/**
 * Normalises a theme name for fuzzy lookup:
 * lower-case + collapse spaces / underscores / hyphens to a single hyphen.
 * e.g. "Tokyo Night", "tokyoNight", "tokyo_night" all → "tokyo-night"
 */
function normalizeKey(name: string): string {
    return name.toLowerCase().replace(/[\s_]+/g, '-');
}

/** Pre-built map: normalised key → original themes key */
const themeIndex: Map<string, string> = new Map(
    Object.keys(themes).map(k => [normalizeKey(k), k])
);

/** Resolve a user-supplied theme name to the actual themes key, or 'default'. */
function resolveThemeName(name: string): string {
    // Exact match first (fast path)
    if (themes[name]) return name;
    // Normalised match (case / separator insensitive)
    const resolved = themeIndex.get(normalizeKey(name));
    return resolved ?? 'default';
}

export function getTheme(themeName: string = 'default', customColors?: {
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    titleColor?: string;
}): Theme {
    const theme = themes[resolveThemeName(themeName)];

    return {
        ...themes.default,
        ...theme,
        fontName: theme.fontName ?? defaultFontName,
        fontFamily: theme.fontFamily ?? defaultFontFamily,
        fontUrl: theme.fontUrl ?? defaultFontUrl,
        // Override with custom colors if provided
        ...(customColors?.bgColor && { bgColor: customColors.bgColor }),
        ...(customColors?.borderColor && { borderColor: customColors.borderColor }),
        ...(customColors?.textColor && { textColor: customColors.textColor }),
        ...(customColors?.titleColor && { titleColor: customColors.titleColor, iconColor: customColors.titleColor }),
    };
}

export function getBadgeTheme(themeName: string = 'default'): BadgeTheme {
    return badgeThemes[themeName] || badgeThemes.default;
}