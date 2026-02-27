/**
 * Express Error Handling Middleware
 * Provides centralized error handling for the application
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, getErrorStatusCode, getErrorCode, isOperationalError, ErrorCode } from '../common/errors.js';
import { Logger, createLogger } from '../common/logger.js';
import { ZodError } from 'zod';
import { formatValidationErrors } from '../common/validation.js';

/**
 * Error response format
 */
interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
        requestId?: string;
    };
}

/**
 * Global error handler middleware
 */
export function errorHandler(logger?: Logger) {
    const log = logger || createLogger({ middleware: 'errorHandler' });

    return (err: Error, req: Request, res: Response, next: NextFunction): void => {
        // Skip if response already sent
        if (res.headersSent) {
            return next(err);
        }

        // Generate request ID for tracking
        const requestId = req.headers['x-request-id'] as string || generateRequestId();

        // Log the error
        const statusCode = getErrorStatusCode(err);
        const errorCode = getErrorCode(err);

        log.error('Request error', err, {
            requestId,
            path: req.path,
            method: req.method,
            statusCode,
            errorCode,
            query: req.query,
            ip: req.ip,
        });

        // Handle Zod validation errors
        if (err instanceof ZodError) {
            const response: ErrorResponse = {
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Validation failed',
                    details: {
                        fields: formatValidationErrors(err),
                    },
                    requestId,
                },
            };

            return void res.status(400).json(response);
        }

        // Handle application errors
        if (err instanceof AppError) {
            const response: ErrorResponse = {
                error: {
                    code: err.code,
                    message: err.message,
                    details: err.details,
                    requestId,
                },
            };

            return void res.status(err.statusCode).json(response);
        }

        // Handle unexpected errors
        const response: ErrorResponse = {
            error: {
                code: ErrorCode.INTERNAL_ERROR,
                message: process.env.NODE_ENV === 'production'
                    ? 'An unexpected error occurred'
                    : err.message,
                requestId,
            },
        };

        res.status(500).json(response);
    };
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: {
            code: ErrorCode.NOT_FOUND,
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
}

/**
 * Request logger middleware
 */
export function requestLogger(logger?: Logger) {
    const log = logger || createLogger({ middleware: 'requestLogger' });

    return (req: Request, res: Response, next: NextFunction): void => {
        const startTime = Date.now();
        const requestId = req.headers['x-request-id'] as string || generateRequestId();

        // Attach request ID to request
        (req as any).requestId = requestId;

        // Log request start
        log.debug('Request started', {
            requestId,
            method: req.method,
            path: req.path,
            query: req.query,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

        // Log response when finished
        res.on('finish', () => {
            const duration = Date.now() - startTime;

            log.info('Request completed', {
                requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
            });
        });

        next();
    };
}

/**
 * Validation middleware factory
 */
export function validate<T>(schema: any, source: 'query' | 'body' | 'params' = 'query') {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = req[source];
            const validated = schema.parse(data);
            (req as any).validated = validated;
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * CORS error handler
 */
export function corsErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
    if (err.message && err.message.includes('CORS')) {
        res.status(403).json({
            error: {
                code: ErrorCode.FORBIDDEN,
                message: 'CORS policy violation',
            },
        });
        return;
    }
    next(err);
}

/**
 * Rate limit error handler
 */
export function rateLimitHandler(req: Request, res: Response): void {
    res.status(429).json({
        error: {
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Too many requests, please try again later',
        },
    });
}
