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
    titleColor: string;
    textColor: string;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    fontName?: string;
    fontFamily?: string;
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
