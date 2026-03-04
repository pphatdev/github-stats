import { closeRedisClient } from "./redis-client.js";

/**
 * Format error for logging based on type
 */
const formatError = (err: unknown): string => {
    if (err instanceof Error) return `${err.message}\n${err.stack ?? ''}`;
    if (err === null || err === undefined) return 'null or undefined';
    if (typeof err === 'object')
        try {
            return JSON.stringify(err, null, 2);
        } catch {
            return '[Circular or non-serializable object]';
        }
    return String(err);
};

/**
 * Graceful exit with cleanup
 */
const gracefulExit = async (code: number): Promise<void> => {
    try {
        await closeRedisClient();
    } catch {
        // Ignore cleanup errors during shutdown
    }
    process.exit(code);
};

/**
 * Register global error handlers
 */
export const getGlobalErrorHandlers = (): void => {
    process.on('uncaughtException', (err: unknown) => {
        console.error('❌ Uncaught Exception:', formatError(err));
        void gracefulExit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
        console.error('❌ Unhandled Rejection:', formatError(reason));
        void gracefulExit(1);
    });
};

/**
 * Setup graceful shutdown handlers
 */
export const setupGracefulShutdown = (): void => {
    const shutdown = async (signal: string): Promise<void> => {
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        await gracefulExit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
};
