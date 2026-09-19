/**
 * Periodic prune job for the `stats_requests` table (H7).
 *
 * Rows are fire-and-forget writes from the tracker middleware; without a
 * cleanup they grow forever. This module deletes rows older than the
 * configured retention on a repeating interval and returns a stop handle
 * so the server can shut the interval down gracefully.
 */

import { lt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { statsRequests } from '../../db/schema.js';
import { createLogger } from '../logs/logger.js';

const logger = createLogger({ module: 'stats-cleanup' });

const HOUR_MS = 60 * 60 * 1000;

export interface StatsCleanupOptions {
    retentionDays: number;
    intervalHours: number;
}

/**
 * Delete rows older than `retentionDays`. Runs an immediate pass and then
 * a repeating one every `intervalHours`. Returns a stop function.
 *
 * The interval is `.unref()`-ed so it never keeps Node alive on its own.
 */
export function scheduleStatsCleanup(opts: StatsCleanupOptions): () => void {
    const retentionMs = opts.retentionDays * 24 * HOUR_MS;
    const intervalMs = opts.intervalHours * HOUR_MS;

    const run = async () => {
        const cutoff = Date.now() - retentionMs;
        try {
            const result = await db.delete(statsRequests).where(lt(statsRequests.created_at, cutoff));
            // Drizzle's better-sqlite3 driver exposes `changes` on the result;
            // it's undefined on other drivers, so log conditionally.
            const changes = (result as { changes?: number }).changes;
            logger.info('Pruned stats_requests', {
                cutoffIso: new Date(cutoff).toISOString(),
                changes: changes ?? 'unknown',
            });
        } catch (err) {
            logger.warn('stats_requests prune failed', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    };

    // Kick off the first pass on next tick so startup isn't blocked.
    setImmediate(run);

    const handle = setInterval(run, intervalMs);
    handle.unref();

    return () => clearInterval(handle);
}
