/**
 * Database Configuration
 * Centralized database connection and pool management
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy';
import Database from 'better-sqlite3';
import * as schema from '../../db/schema.js';
import { getEnv } from './env.js';
import { setDb } from '../../db/index.js';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let cloudflareDbInstance: ReturnType<typeof drizzleProxy> | null = null;
let sqliteInstance: Database.Database | null = null;

function getRequiredCloudflareConfig() {
    const env = getEnv();
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const token = env.CLOUDFLARE_D1_TOKEN;
    const databaseId = env.CLOUDFLARE_D1_DATABASE_ID;

    if (!accountId || !token || !databaseId) {
        throw new Error(
            'Cloudflare D1 is selected, but required env vars are missing: ' +
            'CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN, CLOUDFLARE_D1_DATABASE_ID',
        );
    }

    return { accountId, token, databaseId };
}

function createCloudflareD1Database() {
    const { accountId, token, databaseId } = getRequiredCloudflareConfig();

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

    const proxy = drizzleProxy(
        async (sql, params, method) => {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sql, params }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Cloudflare D1 request failed: ${response.status} ${response.statusText} - ${text}`);
            }

            const payload = (await response.json()) as {
                success?: boolean;
                errors?: Array<{ message?: string }>;
                result?: Array<{ results?: Array<Record<string, unknown>>; success?: boolean }>;
            };

            if (!payload.success) {
                const errorMessage = payload.errors?.[0]?.message || 'Unknown Cloudflare D1 error';
                throw new Error(`Cloudflare D1 query error: ${errorMessage}`);
            }

            const results = payload.result?.[0]?.results ?? [];

            // drizzle-orm/sqlite-proxy expects rows as arrays of values (positional),
            // but D1 returns rows as objects keyed by column name.
            if (method === 'run') {
                return { rows: [] };
            }

            if (method === 'get') {
                if (results.length === 0) {
                    return { rows: [] };
                }
                return { rows: Object.values(results[0]) };
            }

            // 'all' | 'values'
            const rows = results.map(row => Object.values(row));
            return { rows };
        },
        async (queries) => {
            const batchRows: Array<{ rows: unknown[] }> = [];

            for (const query of queries) {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sql: query.sql, params: query.params }),
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Cloudflare D1 batch query failed: ${response.status} ${response.statusText} - ${text}`);
                }

                const payload = (await response.json()) as {
                    success?: boolean;
                    errors?: Array<{ message?: string }>;
                    result?: Array<{ results?: Array<Record<string, unknown>> }>;
                };

                if (!payload.success) {
                    const errorMessage = payload.errors?.[0]?.message || 'Unknown Cloudflare D1 batch error';
                    throw new Error(`Cloudflare D1 batch query error: ${errorMessage}`);
                }

                const results = payload.result?.[0]?.results ?? [];
                const method = query.method;

                if (method === 'run') {
                    batchRows.push({ rows: [] });
                } else if (method === 'get') {
                    batchRows.push({ rows: results.length > 0 ? Object.values(results[0]) : [] });
                } else {
                    batchRows.push({ rows: results.map(row => Object.values(row)) });
                }
            }

            return batchRows;
        },
    );

    return proxy;
}

/**
 * Initialize database connection
 */
export function initializeDatabase() {
    const env = getEnv();

    if (env.DATABASE_PROVIDER === 'cloudflare') {
        if (!cloudflareDbInstance) {
            cloudflareDbInstance = createCloudflareD1Database();
            setDb(cloudflareDbInstance as any);
            console.log('✅ Database connected: Cloudflare D1');
        }

        return cloudflareDbInstance;
    }
    
    if (!sqliteInstance) {
        sqliteInstance = new Database(env.DATABASE_URL);
        
        // Enable WAL mode for better concurrent access
        sqliteInstance.pragma('journal_mode = WAL');
        
        // Initialize Drizzle ORM
        dbInstance = drizzle(sqliteInstance, { schema });

        // Populate the shared db proxy so service imports work on the Node.js path
        setDb(dbInstance as any);
        
        console.log(`✅ Database connected: ${env.DATABASE_URL}`);
    }
    
    return dbInstance;
}

/**
 * Get database instance
 */
export function getDatabase() {
    const env = getEnv();

    if (env.DATABASE_PROVIDER === 'cloudflare') {
        if (!cloudflareDbInstance) {
            return initializeDatabase();
        }
        return cloudflareDbInstance;
    }

    if (!dbInstance) {
        return initializeDatabase();
    }

    return dbInstance;
}

/**
 * Get SQLite instance (for direct queries if needed)
 */
export function getSQLiteInstance() {
    if (!sqliteInstance) {
        initializeDatabase();
    }
    return sqliteInstance;
}

/**
 * Close database connection
 */
export function closeDatabase() {
    if (sqliteInstance) {
        sqliteInstance.close();
        sqliteInstance = null;
        dbInstance = null;
        console.log('✅ Database connection closed');
    }

    if (cloudflareDbInstance) {
        cloudflareDbInstance = null;
    }
}

/**
 * Health check for database
 */
export function checkDatabaseHealth(): boolean {
    try {
        if (getEnv().DATABASE_PROVIDER === 'cloudflare') {
            return !!initializeDatabase();
        }

        const db = getSQLiteInstance();
        db?.prepare('SELECT 1').get();
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
