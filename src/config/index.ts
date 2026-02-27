/**
 * Centralized Configuration Management
 * Provides type-safe access to environment variables with validation
 */

import 'dotenv/config';

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
 * Parse environment variable as integer with default value
 */
function parseIntEnv(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as boolean
 */
function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
}

/**
 * Validate required environment variables
 */
function validateConfig(): void {
    const warnings: string[] = [];

    if (!process.env.GITHUB_TOKEN) {
        warnings.push('GITHUB_TOKEN is not set - API rate limits will be restricted');
    }

    if (warnings.length > 0) {
        console.warn('\n⚠️  Configuration Warnings:');
        warnings.forEach(w => console.warn(`   - ${w}`));
        console.warn('');
    }
}

/**
 * Load and validate application configuration
 */
export function loadConfig(): AppConfig {
    const env = (process.env.APP_ENV || 'development') as 'development' | 'production' | 'test';

    const config: AppConfig = {
        server: {
            port: parseIntEnv(process.env.PORT, 3000),
            env,
            protocol: env === 'production' ? 'https' : 'http',
            host: process.env.HOST || 'localhost',
        },
        github: {
            token: process.env.GITHUB_TOKEN,
            requestCacheTtl: parseIntEnv(process.env.GITHUB_CACHE_TTL, 30 * 60 * 1000), // 30 min
        },
        cache: {
            duration: parseIntEnv(process.env.CACHE_DURATION, 2 * 60 * 60 * 1000), // 2 hours
            warmupUsername: process.env.WARMUP_USERNAME,
        },
        redis: {
            enabled: parseBoolEnv(process.env.REDIS_ENABLED, true),
            url: process.env.REDIS_URL,
            host: process.env.REDIS_HOST,
            port: parseIntEnv(process.env.REDIS_PORT, 6379),
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB ? parseIntEnv(process.env.REDIS_DB, 0) : undefined,
            tls: process.env.REDIS_TLS ? parseBoolEnv(process.env.REDIS_TLS, false) : undefined,
            connectionTimeout: parseIntEnv(process.env.REDIS_CONNECTION_TIMEOUT, 5000),
            commandTimeout: parseIntEnv(process.env.REDIS_COMMAND_TIMEOUT, 3000),
        },
        database: {
            url: process.env.DATABASE_URL || './data/stats.db',
        },
        monitoring: {
            enableMetrics: parseBoolEnv(process.env.ENABLE_METRICS, true),
            enableDebug: parseBoolEnv(process.env.DEBUG, false),
        },
    };

    validateConfig();

    return config;
}

// Singleton configuration instance
let configInstance: AppConfig | null = null;

/**
 * Get the application configuration
 * Creates the configuration on first call
 */
export function getConfig(): AppConfig {
    if (!configInstance) {
        configInstance = loadConfig();
    }
    return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
    configInstance = null;
}
