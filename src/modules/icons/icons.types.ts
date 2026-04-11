/**
 * Icons Module Types
 * Type definitions for icon features
 */

export interface IconQueryParams {
    color?: string;
    size?: string;
}

export type IconEffect = 'wave' | 'glow';

export type IconSize = 'small' | 'medium' | 'large';

export interface IconCollectionQueryParams {
    name?: string;
    color?: string;
    size?: string;
    effect?: string;
    columns?: string;
}

export interface IconCollectionOptions {
    iconNames: string[];
    colors?: string[];
    size: IconSize;
    effect?: IconEffect;
    columns: number;
}

export interface IconCache {
    content: string;
    etag: string;
    timestamp: number;
}

export interface IconCollectionParams {
    collection?: string;
    theme?: string;
}
