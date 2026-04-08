/**
 * Badges Module Types
 * Type definitions for badge generation
 */

export type UserBadgeType =
    | 'visitors'
    | 'repositories'
    | 'organization'
    | 'languages'
    | 'followers'
    | 'total-stars'
    | 'total-contributors'
    | 'total-commits'
    | 'total-code-reviews'
    | 'total-issues'
    | 'total-pull-requests'
    | 'total-joined-years';

export type ProjectBadgeType =
    | 'stars'
    | 'forks'
    | 'contributors'
    | 'commits'
    | 'code-reviews'
    | 'issues'
    | 'pull-requests'
    | 'watchers'
    | 'language'
    | 'license'
    | 'size';

export type BadgeEffect = 'wave' | 'glow';

export type BadgeSize = 'small' | 'medium' | 'large';

export type BadgeName = UserBadgeType | ProjectBadgeType;

export interface BadgeOptions {
    theme?: string;
    customLabel?: string;
    labelColor?: string;
    labelBackground?: string;
    iconColor?: string;
    valueColor?: string;
    valueBackground?: string;
    hideFrame?: boolean;
    customType?: string;
    realtime?: boolean;
    padding?: number;
}

export interface BadgeQueryParams extends BadgeOptions {
    username?: string;
    repo?: string;
    name?: string;
    effect?: BadgeEffect;
    column?: string;
    size?: BadgeSize;
    p?: string;
}

export interface BadgeCache {
    data: string;
    timestamp: number;
}

export interface BadgeRouteDoc {
    requiredParams: string[];
    optionalParams: readonly string[];
    payload: null;
    example: string;
}

export interface BadgeCollectionItem {
    type: UserBadgeType | ProjectBadgeType;
    label?: string;
    options?: BadgeOptions;
}
