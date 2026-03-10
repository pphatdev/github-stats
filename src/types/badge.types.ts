/**
 * Badge Types - Shared badge type definitions
 */

/** User-based badge types (require username parameter) */
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
    | 'total-joined-years'
    | 'trophy';

/** Project/Repository-specific badge types (require owner and repo parameters) */
export type ProjectBadgeType =
    | 'repo-stars'
    | 'repo-forks'
    | 'repo-watchers'
    | 'repo-issues'
    | 'repo-prs'
    | 'repo-contributors'
    | 'repo-size';

/** All badge types combined */
export type BadgeType = UserBadgeType | ProjectBadgeType;

/** Badge theme configuration */
export interface BadgeTheme {
    labelColor: string;
    labelBackground: string;
    valueColor: string;
    valueBackground: string;
}

/** Badge display options */
export interface BadgeOptions {
    /** Badge metric type to display */
    type: BadgeType;
    /** Theme name */
    theme?: string;
    /** Override label background color */
    labelBackground?: string;
    /** Override label text color */
    labelColor?: string;
    /** Override icon color */
    iconColor?: string;
    /** Override value background color */
    valueBackground?: string;
    /** Override value text color */
    valueColor?: string;
    /** Custom label text (overrides the default derived from type) */
    customLabel?: string;
    /** Hide the corner bracket frame (default: false) */
    hideFrame?: boolean;
    /** Hide the icon (default: false) */
    hideIcon?: boolean;
}

/** Common optional parameters for badge routes */
export const BADGE_OPTIONAL_PARAMS = [
    'theme',
    'customLabel',
    'labelColor',
    'labelBackground',
    'iconColor',
    'valueColor',
    'valueBackground',
] as const;

/** Route documentation interface */
export interface BadgeRouteDoc {
    requiredParams: string[];
    optionalParams: readonly string[];
    payload: null;
    example: string;
}
