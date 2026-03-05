import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(__dirname, '../../data/stats.db');
const migrationsFolder = path.join(__dirname, '../../drizzle');

const sqlite = new Database(dbPath);
// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000'); // Wait up to 5 seconds if database is locked
export const db = drizzle(sqlite, { schema });

// Run all pending Drizzle migrations on startup
migrate(db, { migrationsFolder });

// Migrate legacy visitors table into badges (no-op if already done or table absent)
const legacyExists = sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='visitors'`)
    .get();
if (legacyExists) {
    sqlite.exec(`
        INSERT OR IGNORE INTO badges (username, visitors)
        SELECT username, count FROM visitors;
    `);
}
