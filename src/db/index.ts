import { drizzle } from 'drizzle-orm/better-sqlite3';
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

const dbPath = path.join(dataDir, 'stats.db');
const sqlite = new Database(dbPath);

// Simple migration/init
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    username TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
  )
`);

export const db = drizzle(sqlite, { schema });
