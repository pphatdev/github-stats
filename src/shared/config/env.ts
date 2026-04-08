/**
 * Environment Configuration with Validation
 * Uses Zod for runtime validation of environment variables
 */

import 'dotenv/config';
import { z } from 'zod';

// Define environment schema with Zod
const envSchema = z.object({
    // Server Configuration
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('0.0.0.0'),

    // GitHub Configuration
    GITHUB_TOKEN: z.string().optional(),
    GITHUB_CACHE_TTL: z.coerce.number().default(1800000), // 30 min

    // Cache Configuration
    CACHE_DURATION: z.coerce.number().default(7200000), // 2 hours
    WARMUP_USERNAME: z.string().optional(),

    // Redis Configuration
    REDIS_ENABLED: z
        .union([z.boolean(), z.string()])
        .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
        .default(true),
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_USERNAME: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.coerce.number().optional(),
    REDIS_TLS: z
        .union([z.boolean(), z.string()])
        .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
        .optional(),
    REDIS_CONNECTION_TIMEOUT: z.coerce.number().default(5000),
    REDIS_COMMAND_TIMEOUT: z.coerce.number().default(3000),

    // Database Configuration
    DATABASE_PROVIDER: z.enum(['cloudflare', 'sqlite']).default('cloudflare'),
    DATABASE_URL: z.string().default('./data/stats.db'),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_D1_TOKEN: z.string().optional(),
    CLOUDFLARE_D1_DATABASE_ID: z
        .string()
        .default('a2b03b75-e470-480a-acd4-89bad0b42794'),

    // Monitoring
    ENABLE_METRICS: z
        .union([z.boolean(), z.string()])
        .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
        .default(true),
    DEBUG: z
        .union([z.boolean(), z.string()])
        .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
        .default(false),

    // Optional Environment Detection
    ENVIRONMENT: z.string().optional(),
    WORKERS: z.coerce.number().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 */
function validateEnv(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        throw new Error('Environment validation failed');
    }

    // Log warnings for missing optional but recommended variables
    if (!result.data.GITHUB_TOKEN) {
        console.warn('⚠️  GITHUB_TOKEN is not set - API rate limits will be restricted');
    }

    return result.data;
}

// Singleton instance
let envInstance: Env | null = null;

/**
 * Get validated environment configuration
 */
export function getEnv(): Env {
    if (!envInstance) {
        envInstance = validateEnv();
    }
    return envInstance;
}

/**
 * Reset environment (for testing)
 */
export function resetEnv(): void {
    envInstance = null;
}
