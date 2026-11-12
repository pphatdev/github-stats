/**
 * Custom Error Classes
 * Provides structured error handling with proper typing and error codes
 */

export enum ErrorCode {
    // Client Errors (4xx)
    BAD_REQUEST = 'BAD_REQUEST',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // Server Errors (5xx)
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    DATABASE_ERROR = 'DATABASE_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',

    // GitHub Specific
    GITHUB_API_ERROR = 'GITHUB_API_ERROR',
    GITHUB_RATE_LIMIT = 'GITHUB_RATE_LIMIT',
    GITHUB_AUTH_FAILED = 'GITHUB_AUTH_FAILED',
    GITHUB_USER_NOT_FOUND = 'GITHUB_USER_NOT_FOUND',
}

/**
 * Base application error class
 */
export class AppError extends Error {
    constructor(
        public readonly code: ErrorCode,
        public readonly message: string,
        public readonly statusCode: number,
        public readonly isOperational: boolean = true,
        public readonly details?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            ...(this.details && { details: this.details }),
        };
    }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, any>) {
        super(ErrorCode.VALIDATION_ERROR, message, 400, true, details);
    }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(ErrorCode.NOT_FOUND, `${resource} not found`, 404, true);
    }
}

/**
 * GitHub API error
 */
export class GitHubApiError extends AppError {
    constructor(message: string, statusCode: number = 500, details?: Record<string, any>) {
        super(ErrorCode.GITHUB_API_ERROR, message, statusCode, true, details);
    }
}

/**
 * GitHub rate limit error (429)
 */
export class GitHubRateLimitError extends AppError {
    constructor(resetTime?: Date) {
        super(
            ErrorCode.GITHUB_RATE_LIMIT,
            'GitHub API rate limit exceeded. Please set a valid GITHUB_TOKEN or wait for rate limit reset.',
            429,
            true,
            resetTime ? { resetAt: resetTime.toISOString() } : undefined
        );
    }
}

/**
 * GitHub authentication error (401)
 */
export class GitHubAuthError extends AppError {
    constructor() {
        super(
            ErrorCode.GITHUB_AUTH_FAILED,
            'GitHub authentication failed. Your GITHUB_TOKEN may be invalid or expired.',
            401,
            true
        );
    }
}

/**
 * GitHub user not found error (404)
 */
export class GitHubUserNotFoundError extends AppError {
    constructor(username: string) {
        super(
            ErrorCode.GITHUB_USER_NOT_FOUND,
            `GitHub user '${username}' not found`,
            404,
            true,
            { username }
        );
    }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
    constructor(message: string, details?: Record<string, any>) {
        super(ErrorCode.DATABASE_ERROR, message, 500, true, details);
    }
}

/**
 * Cache error (500)
 */
export class CacheError extends AppError {
    constructor(message: string, details?: Record<string, any>) {
        super(ErrorCode.CACHE_ERROR, message, 500, true, details);
    }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
    constructor(service: string) {
        super(
            ErrorCode.SERVICE_UNAVAILABLE,
            `${service} is temporarily unavailable`,
            503,
            true
        );
    }
}

/**
 * Check if error is an operational error (expected/handled)
 */
export function isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Extract HTTP status code from error
 */
export function getErrorStatusCode(error: Error): number {
    if (error instanceof AppError) {
        return error.statusCode;
    }
    return 500;
}

/**
 * Get error code from error
 */
export function getErrorCode(error: Error): ErrorCode {
    if (error instanceof AppError) {
        return error.code;
    }
    return ErrorCode.INTERNAL_ERROR;
}
