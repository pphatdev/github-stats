/**
 * Centralized Configuration Management
 * Exports all configuration modules
 */

// Export environment configuration
export { getEnv, resetEnv, type Env } from './env.js';

// Export database configuration
export {
    initializeDatabase,
    getDatabase,
    getSQLiteInstance,
    closeDatabase,
    checkDatabaseHealth
} from './db.js';

// Export logger
export {
    Logger,
    LogLevel,
    getLogger,
    createLogger,
    type LogContext,
    type LogEntry
} from './logger.js';

// Export Swagger configuration
export { getSwaggerConfig, generateOpenAPISpec, type SwaggerConfig } from './swagger.js';

// Backward compatibility - maintain old AppConfig interface
import { getEnv, type Env } from './env.js';

export interface AppConfig {
    server: {
        port: number;
        env: 'development' | 'production' | 'test';
        protocol: 'http' | 'https';
        host: string;
    };
    github: {
        token?: string;
        requestCacheTtl: number;
    };
    cache: {
        duration: number;
        warmupUsername?: string;
    };
    redis: {
        enabled: boolean;
        url?: string;
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        db?: number;
        tls?: boolean;
        connectionTimeout?: number;
        commandTimeout?: number;
    };
    database: {
        url: string;
    };
    monitoring: {
        enableMetrics: boolean;
        enableDebug: boolean;
    };
}

/**
 * Get the application configuration (backward compatible)
 * @deprecated Use getEnv() instead for type-safe environment access
 */
export function getConfig(): AppConfig {
    const env = getEnv();

    return {
        server: {
            port: env.PORT,
            env: env.APP_ENV,
            protocol: env.APP_ENV === 'production' ? 'https' : 'http',
            host: env.HOST,
        },
        github: {
            token: env.GITHUB_TOKEN,
            requestCacheTtl: env.GITHUB_CACHE_TTL,
        },
        cache: {
            duration: env.CACHE_DURATION,
            warmupUsername: env.WARMUP_USERNAME,
        },
        redis: {
            enabled: env.REDIS_ENABLED,
            url: env.REDIS_URL,
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            username: env.REDIS_USERNAME,
            password: env.REDIS_PASSWORD,
            db: env.REDIS_DB,
            tls: env.REDIS_TLS,
            connectionTimeout: env.REDIS_CONNECTION_TIMEOUT,
            commandTimeout: env.REDIS_COMMAND_TIMEOUT,
        },
        database: {
            url: env.DATABASE_URL,
        },
        monitoring: {
            enableMetrics: env.ENABLE_METRICS,
            enableDebug: env.DEBUG,
        },
    };
}
