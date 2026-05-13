/**
 * Languages Module Types
 * Type definitions for the languages feature
 */

export interface LanguageQueryParams {
    username: string;
    type?: 'card' | 'pie';
    theme?: string;
    show_info?: string;
    info_outline?: 'solid' | 'frame';
    size?: 'small' | 'medium' | 'large' | 'default';
}

export interface LanguageData {
    name: string;
    percentage: number;
    color: string;
    bytes: number;
}

export interface LanguageCache {
    data: string;
    timestamp: number;
}

export interface LanguageCardOptions {
    theme: string;
    showInfo: boolean;
    dataBorderStyle: 'solid' | 'frame';
}

export interface LanguagePieOptions {
    theme: string;
}
