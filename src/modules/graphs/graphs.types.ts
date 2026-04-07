/**
 * Graphs Module Types
 * Type definitions for the graphs feature
 */

export interface GraphQueryParams {
    username: string;
    theme?: string;
    year?: string;
    animate?: string;
    size?: string;
    as?: string;
    format?: string;
    show_title?: string;
    show_total_contribution?: string;
    show_background?: string;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    titleColor?: string;
}

export interface GraphCache {
    data: string;
    timestamp: number;
}

export interface GraphOptions {
    theme: string;
    showTitle: boolean;
    showTotalContribution: boolean;
    showBackground: boolean;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    titleColor?: string;
}

export interface GraphDateRange {
    from: string;
    to: string;
    displayYear: string | number;
    cacheKeyExtra: string;
}
