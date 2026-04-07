/**
 * Shared Constants
 * Application-wide constants
 */

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMIT: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
} as const;

export const CACHE_DURATIONS = {
    SHORT: 300,      // 5 minutes
    MEDIUM: 1800,    // 30 minutes
    LONG: 3600,      // 1 hour
    VERY_LONG: 86400 // 24 hours
} as const;

export const API_LIMITS = {
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE_SIZE: 20,
    MAX_BATCH_SIZE: 50
} as const;
