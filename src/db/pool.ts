/**
 * Optimized Database Connection Pool
 * Provides performance-tuned SQLite connections with connection pooling
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createLogger } from '../shared/logs/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = createLogger({ service: 'DatabasePool' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PoolOptions {
    minConnections?: number;
    maxConnections?: number;
    idleTimeout?: number;
    acquireTimeout?: number;
}

/**
 * SQLite Connection Pool for better performance
 */
export class SQLitePool {
    private connections: Database.Database[] = [];
    private available: Database.Database[] = [];
    private pending: Array<{ resolve: (db: Database.Database) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }> = [];
    private dbPath: string = '';
    private options: Required<PoolOptions> = { minConnections: 2, maxConnections: 10, idleTimeout: 30000, acquireTimeout: 5000 };
    private lastUsed: Map<Database.Database, number> = new Map();

    constructor(dbPath: string, options: PoolOptions = {}) {
        try {
            this.dbPath = dbPath;
            this.options = {
                minConnections: options.minConnections || 2,
                maxConnections: options.maxConnections || 10,
                idleTimeout: options.idleTimeout || 30000, // 30 seconds
                acquireTimeout: options.acquireTimeout || 5000, // 5 seconds
            };

            // Initialize minimum connections
            for (let i = 0; i < this.options.minConnections; i++) {
                try {
                    this.createConnection();
                } catch (error) {
                    logger.warn('Failed to create initial connection', {
                        error: error instanceof Error ? error.message : String(error),
                        attempt: i + 1
                    });
                    // Continue and try next connection
                }
            }

            // Cleanup idle connections periodically
            setInterval(() => this.cleanupIdleConnections(), 10000);

            logger.info('Database pool initialized', {
                path: dbPath,
                min: this.options.minConnections,
                max: this.options.maxConnections,
                created: this.connections.length
            });
        } catch (error) {
            logger.error('Failed to initialize database pool', error instanceof Error ? error : new Error(String(error)));
            // Don't re-throw, let pool be created in degraded state
        }
    }

    /**
     * Create a new optimized connection
     */
    private createConnection(): Database.Database {
        try {
            const connection = new Database(this.dbPath);

            // Performance optimizations
            try {
                connection.pragma('journal_mode = WAL'); // Write-Ahead Logging
                connection.pragma('synchronous = NORMAL'); // Faster writes
                connection.pragma('cache_size = -64000'); // 64MB cache
                connection.pragma('temp_store = MEMORY'); // Store temp tables in memory
                connection.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O
                connection.pragma('page_size = 4096'); // Larger page size
                connection.pragma('busy_timeout = 5000'); // Wait up to 5s for locks
                connection.pragma('optimize'); // Optimize query planner
            } catch (pragmaError) {
                // Continue even if pragma fails
                logger.warn('Some pragma optimizations failed', { 
                    error: pragmaError instanceof Error ? pragmaError.message : String(pragmaError)
                });
            }

            this.connections.push(connection);
            this.available.push(connection);
            this.lastUsed.set(connection, Date.now());

            logger.debug('New connection created', { 
                total: this.connections.length,
                available: this.available.length 
            });

            return connection;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('Failed to create database connection', error instanceof Error ? error : new Error(errorMsg));
            throw error;
        }
    }

    /**
     * Acquire a connection from the pool
     */
    async acquire(): Promise<Database.Database> {
        // Return available connection if any
        if (this.available.length > 0) {
            const connection = this.available.pop()!;
            this.lastUsed.set(connection, Date.now());
            return connection;
        }

        // Create new connection if under max
        if (this.connections.length < this.options.maxConnections) {
            return this.createConnection();
        }

        // Wait for a connection to become available
        return new Promise<Database.Database>((resolve, reject) => {
            const timer = setTimeout(() => {
                const index = this.pending.findIndex(p => p.resolve === resolve);
                if (index !== -1) {
                    this.pending.splice(index, 1);
                }
                reject(new Error('Connection acquire timeout'));
            }, this.options.acquireTimeout);

            this.pending.push({ resolve, reject, timer });
        });
    }

    /**
     * Release a connection back to the pool
     */
    release(connection: Database.Database): void {
        this.lastUsed.set(connection, Date.now());

        // Fulfill pending request if any
        if (this.pending.length > 0) {
            const { resolve, timer } = this.pending.shift()!;
            clearTimeout(timer);
            resolve(connection);
            return;
        }

        // Return to available pool
        if (!this.available.includes(connection)) {
            this.available.push(connection);
        }
    }

    /**
     * Execute a query with automatic connection management
     */
    async execute<T>(callback: (db: Database.Database) => T): Promise<T> {
        const connection = await this.acquire();
        try {
            return callback(connection);
        } finally {
            this.release(connection);
        }
    }

    /**
     * Execute a transaction
     */
    async transaction<T>(callback: (db: Database.Database) => T): Promise<T> {
        const connection = await this.acquire();
        try {
            connection.prepare('BEGIN').run();
            const result = callback(connection);
            connection.prepare('COMMIT').run();
            return result;
        } catch (error) {
            connection.prepare('ROLLBACK').run();
            throw error;
        } finally {
            this.release(connection);
        }
    }

    /**
     * Cleanup idle connections
     */
    private cleanupIdleConnections(): void {
        const now = Date.now();
        const keepMin = this.options.minConnections;

        if (this.available.length <= keepMin) {
            return;
        }

        const toRemove: Database.Database[] = [];

        for (const connection of this.available) {
            const lastUsed = this.lastUsed.get(connection) || now;
            const idle = now - lastUsed;

            if (idle > this.options.idleTimeout && this.connections.length > keepMin) {
                toRemove.push(connection);
            }
        }

        for (const connection of toRemove) {
            const index = this.available.indexOf(connection);
            if (index !== -1) {
                this.available.splice(index, 1);
            }

            const connIndex = this.connections.indexOf(connection);
            if (connIndex !== -1) {
                this.connections.splice(connIndex, 1);
            }

            this.lastUsed.delete(connection);
            connection.close();

            logger.debug('Closed idle connection', {
                remaining: this.connections.length
            });
        }
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            total: this.connections.length,
            available: this.available.length,
            pending: this.pending.length,
            inUse: this.connections.length - this.available.length
        };
    }

    /**
     * Close all connections
     */
    async close(): Promise<void> {
        logger.info('Closing database pool...');

        // Reject all pending requests
        for (const { reject, timer } of this.pending) {
            clearTimeout(timer);
            reject(new Error('Pool is closing'));
        }
        this.pending = [];

        // Close all connections
        for (const connection of this.connections) {
            connection.close();
        }

        this.connections = [];
        this.available = [];
        this.lastUsed.clear();

        logger.info('Database pool closed');
    }
}

/**
 * Shared pool instance
 */
let sharedPool: SQLitePool | null = null;

export function getDbPool(): SQLitePool {
    if (!sharedPool) {
        const dbPath = path.join(__dirname, '../../data/stats.db');
        sharedPool = new SQLitePool(dbPath, {
            minConnections: 2,
            maxConnections: 10,
            idleTimeout: 30000
        });
    }
    return sharedPool;
}

/**
 * Get optimized Drizzle instance
 */
export async function getOptimizedDb() {
    const pool = getDbPool();
    const connection = await pool.acquire();
    
    return {
        db: drizzle(connection),
        release: () => pool.release(connection)
    };
}
