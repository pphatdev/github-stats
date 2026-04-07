/**
 * Badges Module
 * Exports all badge-related functionality
 */

export { BadgesController } from './badges.controller.js';
export { BadgesService } from './badges.service.js';
export { createBadgesRouter } from './badges.routes.js';
export type {
    UserBadgeType,
    ProjectBadgeType,
    BadgeOptions,
    BadgeQueryParams,
    BadgeCache,
    BadgeRouteDoc,
    BadgeCollectionItem
} from './badges.types.js';
