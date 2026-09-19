import { Theme } from '../types/themes.type.js';
import { baseThemes } from './themes/base.js';
import { graphThemes } from './themes/graph.js';
import { badgeThemes } from './themes/badge.js';
import { BadgeTheme } from '../types/badge.types.js';

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

/** Pre-built map: normalised key → original badgeThemes key */
const badgeThemeIndex: Map<string, string> = new Map(
    Object.keys(badgeThemes).map(k => [normalizeKey(k), k])
);

/** Resolve a user-supplied theme name to the actual themes key, or 'default'. */
function resolveThemeName(name: string): string {
    // Exact match first (fast path)
    if (themes[name]) return name;
    // Normalised match (case / separator insensitive)
    const resolved = themeIndex.get(normalizeKey(name));
    return resolved ?? 'default';
}

/** Resolve a user-supplied badge theme name to the actual badgeThemes key, or 'default'. */
function resolveBadgeThemeName(name: string): string {
    // Exact match first (fast path)
    if (badgeThemes[name]) return name;
    // Normalised match (case / separator insensitive)
    const resolved = badgeThemeIndex.get(normalizeKey(name));
    return resolved ?? 'default';
}

/** Does a user-supplied theme name resolve to a registered theme? Uses the
 * same fuzzy matching rules as `resolveThemeName`. */
export function isKnownTheme(name: string): boolean {
    return themes[name] !== undefined || themeIndex.has(normalizeKey(name));
}

/** Does a user-supplied badge theme name resolve to a registered badge theme? */
export function isKnownBadgeTheme(name: string): boolean {
    return badgeThemes[name] !== undefined || badgeThemeIndex.has(normalizeKey(name));
}

/** Public wrapper for `resolveThemeName` — canonicalises aliases like
 * `Ocean` / `tokyo_night` to their storage key. Falls back to `'default'`
 * for unknown names so callers never end up with an untyped string. */
export function normalizeThemeName(name: string): string {
    return resolveThemeName(name);
}

/** Public wrapper for `resolveBadgeThemeName`. */
export function normalizeBadgeThemeName(name: string): string {
    return resolveBadgeThemeName(name);
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
    return badgeThemes[resolveBadgeThemeName(themeName)];
}