import { ThemeOverrides } from "./themes.type.js";

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


export interface ContributionGraphData {
    username: string;
    year: string | number;
    totalContributions: number;
    weeks: ContributionDay[][];
}

export interface ContributionDay {
    date: string;
    count: number;
    level: number;
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