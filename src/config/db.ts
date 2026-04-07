/**
 * Database Configuration
 * Centralized database connection and pool management
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../db/schema.js';
import { getEnv } from './env.js';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database.Database | null = null;

/**
 * Initialize database connection
 */
export function initializeDatabase() {
    const env = getEnv();
    
    if (!sqliteInstance) {
        sqliteInstance = new Database(env.DATABASE_URL);
        
        // Enable WAL mode for better concurrent access
        sqliteInstance.pragma('journal_mode = WAL');
        
        // Initialize Drizzle ORM
        dbInstance = drizzle(sqliteInstance, { schema });
        
        console.log(`✅ Database connected: ${env.DATABASE_URL}`);
    }
    
    return dbInstance;
}

/**
 * Get database instance
 */
export function getDatabase() {
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
}

/**
 * Health check for database
 */
export function checkDatabaseHealth(): boolean {
    try {
        const db = getSQLiteInstance();
        db?.prepare('SELECT 1').get();
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
