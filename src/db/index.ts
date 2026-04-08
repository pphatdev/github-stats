import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';
import type { D1Database } from '@cloudflare/workers-types';

type DrizzleD1 = ReturnType<typeof drizzle<typeof schema>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _instance: any = null;

/**
 * Initialize database with a Cloudflare D1 binding.
 * Call this at the start of every Worker fetch handler before routing.
 *
 *   import { initializeD1 } from './db/index.js';
 *   export default { async fetch(req, env) { initializeD1(env.DB); ... } }
 */
export function initializeD1(d1: D1Database): void {
    _instance = drizzle(d1, { schema });
}

/**
 * Inject an existing Drizzle instance from outside (Node.js / local-dev path).
 * Called from src/config/db.ts after SQLite initialisation so the same
 * `import { db }` proxy works for both deployment targets.
 */
export function setDb(instance: DrizzleD1): void {
    _instance = instance;
}

/**
 * Transparent proxy over the active Drizzle instance.
 * All existing `import { db } from '../../db/index.js'` calls continue to work
 * without any changes in the service or controller files.
 */
export const db = new Proxy({} as DrizzleD1, {
    get(_, prop: string | symbol) {
        if (!_instance) {
            throw new Error(
                'Database not initialized. ' +
                'Call initializeD1(env.DB) in the Worker fetch handler, ' +
                'or initializeDatabase() from src/shared/config/db.ts for the Node.js path.',
            );
        }
        const val = (_instance as Record<string | symbol, unknown>)[prop];
        return typeof val === 'function' ? (val as Function).bind(_instance) : val;
    },
});
