import { Theme } from '../types.js';
import { baseThemes } from './themes/base.js';
import { graphThemes } from './themes/graph.js';

const defaultFontName = 'Orbitron';
const defaultFontFamily = `'${defaultFontName}', 'Ubuntu', 'sans-serif'`;
const defaultFontUrl = '/fonts/orbitron.woff2';

export const themes: { [key: string]: Theme } = { ...baseThemes, ...graphThemes };

export function getTheme(themeName: string = 'default', customColors?: {
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    titleColor?: string;
}): Theme {
    const theme = themes[themeName] || themes.default;

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