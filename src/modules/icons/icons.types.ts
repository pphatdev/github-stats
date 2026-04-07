/**
 * Icons Module Types
 * Type definitions for icon features
 */

export interface IconQueryParams {
    color?: string;
    size?: string;
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
