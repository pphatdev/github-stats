/**
 * Custom Error Classes
 * Application-specific error types
 */

export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code: string = 'INTERNAL_ERROR',
        public isOperational: boolean = true
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, public details?: any) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Conflict') {
        super(message, 409, 'CONFLICT');
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(message: string = 'Service temporarily unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE', false);
    }
}

export class ExternalServiceError extends AppError {
    constructor(message: string, public service: string) {
        super(message, 502, 'EXTERNAL_SERVICE_ERROR', false);
    }
}

/**
 * Error utility functions
 */
export function isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

export function getErrorStatusCode(error: Error): number {
    if (error instanceof AppError) {
        return error.statusCode;
    }
    return 500;
}

export function getErrorCode(error: Error): string {
    if (error instanceof AppError) {
        return error.code;
    }
    return 'INTERNAL_ERROR';
}
