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
}
