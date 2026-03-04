import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

/**
 * Determine if TLS should be enabled based on environment and host
 */
function shouldEnableTLS(host: string | undefined): boolean {
    // Explicit TLS setting takes priority
    if (process.env.REDIS_TLS === 'true') return true;
    if (process.env.REDIS_TLS === 'false') return false;

    // Auto-detect TLS for known cloud providers
    if (!host) return false;

    const tlsHosts = [
        'cloud.redislabs.com',      // Redis Cloud
        'cache.amazonaws.com',       // AWS ElastiCache
        'redis-enterprise.com',      // Redis Enterprise
        'redislabs.com',             // Redis Labs
        'render.com',                // Render.com hosting
    ];

    return tlsHosts.some(tlsHost => host.includes(tlsHost));
}

/**
 * Log connection details (sanitized for security)
 */
function logConnectionDetails(host: string, port: number, tls: boolean): void {
    const tlsStatus = tls ? '🔒 TLS Enabled' : '⚠️  TLS Disabled';
    console.log(`📡 Redis Connection: ${host}:${port} (${tlsStatus})`);

    if (process.env.DEBUG_REDIS === 'true') {
        console.log(`🔍 Debug: TLS=${tls}, Host=${host}, Port=${port}`);
    }
}

/**
 * Build Redis URL from environment variables
 * Useful when socket-based config has TLS issues
 */
function buildRedisUrl(host: string, port: number, username: string, password: string, useTls: boolean): string {
    const protocol = useTls ? 'rediss' : 'redis';
    // URL encode the password in case it contains special characters
    const encodedPassword = encodeURIComponent(password);
    const encodedUsername = encodeURIComponent(username);
    const dbIndex = getRedisDbIndex();
    const dbPath = dbIndex !== null ? `/${dbIndex}` : '';
    return `${protocol}://${encodedUsername}:${encodedPassword}@${host}:${port}${dbPath}`;
}

function getRedisDbIndex(): number | null {
    if (!process.env.REDIS_DB) {
        return null;
    }

    const dbIndex = Number.parseInt(process.env.REDIS_DB, 10);
    if (Number.isNaN(dbIndex)) {
        console.warn('⚠️  REDIS_DB must be a number (database index).');
        return null;
    }

    return dbIndex;
}

export async function getRedisClient(): Promise<RedisClientType> {
    if (redisClient) {
        return redisClient;
    }

    // Configuration priority:
    // 1. Socket-based config (REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD)
    // 2. URL-based config (REDIS_URL)
    // 3. Default local Redis

    const shouldUseSocketConfig =
        process.env.REDIS_HOST ||
        process.env.REDIS_PORT ||
        process.env.REDIS_USERNAME ||
        process.env.REDIS_PASSWORD;

    if (shouldUseSocketConfig) {
        // Socket-based configuration (for Redis Cloud, AWS ElastiCache, etc.)
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379', 10);
        const username = process.env.REDIS_USERNAME || 'default';
        const password = process.env.REDIS_PASSWORD || '';
        const tls = shouldEnableTLS(host);

        logConnectionDetails(host, port, tls);

        try {
            // For Redis Cloud and managed services, URL-based config often works better for TLS
            // The rediss:// protocol (with double 's') handles TLS automatically
            if (tls && host.includes('cloud.redislabs.com')) {
                console.log(`📡 Using URL-based config for better TLS handling with Redis Cloud...`);
                const redisUrl = buildRedisUrl(host, port, username, password, true);
                redisClient = createClient({
                    url: redisUrl,
                });
            } else {
                // Standard socket-based config for local/non-TLS scenarios
                const socketConfig: any = {
                    host,
                    port,
                };

                if (tls) {
                    socketConfig.tls = true;
                    // TLS options for better compatibility
                    socketConfig.rejectUnauthorized = false; // Allow self-signed certificates
                }

                redisClient = createClient({
                    username,
                    password,
                    socket: socketConfig,
                });
            }
        } catch (error) {
            console.error('❌ Failed to create Redis client with socket config:', error);
            throw error;
        }
    } else {
        // URL-based configuration (simpler approach)
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        console.log(`📡 Redis Connection: Using REDIS_URL environment variable`);

        try {
            redisClient = createClient({
                url: redisUrl,
            });
        } catch (error) {
            console.error('❌ Failed to create Redis client with URL config:', error);
            throw error;
        }
    }

    redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err.message || err);
        if (process.env.DEBUG_REDIS === 'true') {
            console.error('Full error:', err);
        }
    });
    redisClient.on('connect', () => console.log('✅ Redis Client Connected'));
    redisClient.on('ready', () => console.log('✅ Redis Client Ready'));
    redisClient.on('reconnecting', () => console.log('🔄 Redis Client Reconnecting...'));

    try {
        await redisClient.connect();
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        if (error instanceof Error && error.message.includes('packet length too long')) {
            console.error('💡 Hint: This error suggests a TLS/SSL mismatch.');
            console.error('   Try one of these solutions:');
            console.error('   1. Try URL-based config: Set REDIS_URL=rediss://user:pass@host:port');
            console.error('   2. For Redis Cloud: Use the standard TLS port (usually 10434)');
            console.error('   3. Check your Redis Cloud dashboard for the exact connection string');
            console.error('   4. Ensure your password doesn\'t have special characters or URL-encode it');
        }
        throw error;
    }

    const dbIndex = getRedisDbIndex();
    if (dbIndex !== null) {
        try {
            await redisClient.select(dbIndex);
            console.log(`✅ Redis database selected: ${dbIndex}`);
        } catch (error) {
            console.error('❌ Failed to select Redis database:', error);
            throw error;
        }
    } else if (process.env.REDIS_DB_NAME) {
        console.warn('⚠️  Redis uses numeric database indexes; REDIS_DB_NAME is ignored.');
        console.warn('⚠️  Set REDIS_DB to a number (e.g., 0) if you need database selection.');
    }

    return redisClient;
}

export async function closeRedisClient(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}

export function isRedisConnected(): boolean {
    return redisClient !== null && redisClient.isOpen;
}

// Cache key prefix to avoid collisions
export const CACHE_KEYS = {
    STATS: (username: string) => `stats:${username}`,
    LANGUAGES: (username: string) => `languages:${username}`,
    GRAPH: (username: string, params: string) => `graph:${username}:${params}`,
    BADGE_VISITORS: (username: string) => `badge:visitors:${username}`,
    BADGE_REPOSITORIES: (username: string) => `badge:repositories:${username}`,
    BADGE_ORGANIZATION: (username: string) => `badge:organization:${username}`,
    BADGE_LANGUAGES: (username: string) => `badge:languages:${username}`,
    BADGE_FOLLOWERS: (username: string) => `badge:followers:${username}`,
    BADGE_TOTAL_STARS: (username: string) => `badge:total_stars:${username}`,
    BADGE_TOTAL_CONTRIBUTORS: (username: string) => `badge:total_contributors:${username}`,
    BADGE_TOTAL_COMMITS: (username: string) => `badge:total_commits:${username}`,
    BADGE_TOTAL_CODE_REVIEWS: (username: string) => `badge:total_code_reviews:${username}`,
    BADGE_TOTAL_ISSUES: (username: string) => `badge:total_issues:${username}`,
    BADGE_TOTAL_PULL_REQUESTS: (username: string) => `badge:total_pull_requests:${username}`,
    BADGE_TOTAL_JOINED_YEARS: (username: string) => `badge:total_joined_years:${username}`,
    // Project/Repository-specific badge cache keys
    BADGE_REPO_STARS: (owner: string, repo: string) => `badge:repo_stars:${owner}:${repo}`,
    BADGE_REPO_FORKS: (owner: string, repo: string) => `badge:repo_forks:${owner}:${repo}`,
    BADGE_REPO_WATCHERS: (owner: string, repo: string) => `badge:repo_watchers:${owner}:${repo}`,
    BADGE_REPO_ISSUES: (owner: string, repo: string) => `badge:repo_issues:${owner}:${repo}`,
    BADGE_REPO_PRS: (owner: string, repo: string) => `badge:repo_prs:${owner}:${repo}`,
    BADGE_REPO_CONTRIBUTORS: (owner: string, repo: string) => `badge:repo_contributors:${owner}:${repo}`,
    BADGE_REPO_SIZE: (owner: string, repo: string) => `badge:repo_size:${owner}:${repo}`,
    USER_DATA: (username: string) => `user:${username}`,
};

// Default cache TTLs (in seconds)
export const DEFAULT_TTL = {
    STATS: 7200,           // 2 hours (increased from 1 hour for better hit rate)
    LANGUAGES: 7200,       // 2 hours (increased from 1 hour)
    GRAPH: 3600,           // 1 hour (increased from 30 minutes)
    BADGE: 3600,           // 1 hour (increased from 30 minutes)
    USER_DATA: 7200,       // 2 hours (increased from 1 hour)
};

/**
 * Get badge cache key generator by badge type
 * @param badgeType - The badge type (e.g., 'VISITORS', 'FOLLOWERS', 'TOTAL_STARS')
 * @returns Cache key generator function or null if invalid type
 */
export function getBadgeCacheKey(badgeType: string): ((username: string) => string) | null {
    const key = `BADGE_${badgeType}` as const;
    const badgeKeys: Record<string, (username: string) => string> = {
        'BADGE_VISITORS': CACHE_KEYS.BADGE_VISITORS,
        'BADGE_REPOSITORIES': CACHE_KEYS.BADGE_REPOSITORIES,
        'BADGE_ORGANIZATION': CACHE_KEYS.BADGE_ORGANIZATION,
        'BADGE_LANGUAGES': CACHE_KEYS.BADGE_LANGUAGES,
        'BADGE_FOLLOWERS': CACHE_KEYS.BADGE_FOLLOWERS,
        'BADGE_TOTAL_STARS': CACHE_KEYS.BADGE_TOTAL_STARS,
        'BADGE_TOTAL_CONTRIBUTORS': CACHE_KEYS.BADGE_TOTAL_CONTRIBUTORS,
        'BADGE_TOTAL_COMMITS': CACHE_KEYS.BADGE_TOTAL_COMMITS,
        'BADGE_TOTAL_CODE_REVIEWS': CACHE_KEYS.BADGE_TOTAL_CODE_REVIEWS,
        'BADGE_TOTAL_ISSUES': CACHE_KEYS.BADGE_TOTAL_ISSUES,
        'BADGE_TOTAL_PULL_REQUESTS': CACHE_KEYS.BADGE_TOTAL_PULL_REQUESTS,
        'BADGE_TOTAL_JOINED_YEARS': CACHE_KEYS.BADGE_TOTAL_JOINED_YEARS,
    };

    return badgeKeys[key] || null;
}
