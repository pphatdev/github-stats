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

export interface Theme {
    titleColor: string;
    textColor: string;
    iconColor: string;
    bgColor: string;
    borderColor: string;
}

export interface CardOptions {
    username: string;
    theme?: string;
    hideTitle?: boolean;
    hideBorder?: boolean;
    hideRank?: boolean;
    showIcons?: boolean;
    customTitle?: string;
}
