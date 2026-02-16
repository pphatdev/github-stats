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

export interface CardOptions {
    username: string;
    theme?: string;
    hideTitle?: boolean;
    hideBorder?: boolean;
    hideRank?: boolean;
    customTitle?: string;
    showInfo?: boolean;
    listLength?: number;
    variant?: 'bubbles' | 'pie';
    type?: 'card' | 'pie';
    avatarMode?: 'none' | 'avatar' | 'radar';
    dataBorderStyle?: 'solid' | 'frame';
    dataBorderFramePosition?: 'in' | 'out';
    // Custom colors (override theme colors)
    titleColor?: string;
    textColor?: string;
    iconColor?: string;
    bgColor?: string;
    borderColor?: string;
}
