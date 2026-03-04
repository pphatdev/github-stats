// Re-export badge types from the dedicated badge types file
export type { BadgeType, UserBadgeType, ProjectBadgeType, BadgeTheme, BadgeOptions, BadgeRouteDoc } from './types/badge.types.js';
export { BADGE_OPTIONAL_PARAMS } from './types/badge.types.js';

export interface GitHubStats {
    name: string;
    avatarUrl: string;
    totalStars: number;
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    contributedTo: number;
    rank?: {
        level: string;
        score: number;
    };
}

export interface LanguageCount {
    name: string;
    count: number;
}

export interface Theme {
    /** Card/graph title text color */
    titleColor: string;
    /** General body text, labels, and subtitle color */
    textColor: string;
    /** Icons, accents, graph heatmap cell fill color, and data chart color */
    iconColor: string;
    /** Card/graph background fill color */
    bgColor: string;
    /** Card border, divider lines, and grid line color */
    borderColor: string;
    /** Font name (e.g. 'Orbitron') — defaults to Orbitron */
    fontName?: string;
    /** Full CSS font-family stack (e.g. "'Orbitron', sans-serif") */
    fontFamily?: string;
    /** URL to the woff2 font file for @font-face embedding */
    fontUrl?: string;
}

export interface ThemeOverrides {
    theme?: string;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    titleColor?: string;
}

export interface StatsCardOptions extends ThemeOverrides {
    hideTitle?: boolean;
    hideBorder?: boolean;
    hideRank?: boolean;
    showIcons?: boolean;
    customTitle?: string;
    avatarMode?: 'none' | 'avatar' | 'radar';
    dataBorderStyle?: 'solid' | 'frame';
    dataBorderFramePosition?: 'in' | 'out';
}

export interface LanguagesCardOptions extends ThemeOverrides {
    showInfo?: boolean;
    listLength?: number;
    variant?: 'bubbles' | 'pie';
    dataBorderStyle?: 'solid' | 'frame';
    dataBorderFramePosition?: 'in' | 'out';
}

export interface LanguagesPieChartOptions extends ThemeOverrides {
    listLength?: number;
}

export interface ContributionDay {
    date: string;
    count: number;
    level: number;
}

export interface ContributionGraphData {
    username: string;
    year: string | number;
    totalContributions: number;
    weeks: ContributionDay[][];
}

export interface GraphCardOptions extends ThemeOverrides {
    year?: string | number;
    animate?: 'none' | 'glow' | 'wave' | 'pulse';
    /** Output format. Default: 'svg'. Use 'webp', 'png', or 'gif' for raster conversion. */
    as?: 'svg' | 'webp' | 'png' | 'gif';
    /** Canvas size preset. 'default' = 1200×600, 'small' = 800×400, 'medium' = 1000×500, 'large' = 1400×700 */
    size?: 'small' | 'medium' | 'large' | 'default';
    /** Show/hide the title (username + year). When false, content is centered. Default: true */
    show_title?: boolean;
    /** Show/hide the total contributions subtitle. When false, SVG height shrinks to fit content. Default: true */
    show_total_contribution?: boolean;
    /** Show/hide the background (gradient, stars, grid lines). When false, bg is transparent and SVG width fits the cells. Default: true */
    show_background?: boolean;
}
