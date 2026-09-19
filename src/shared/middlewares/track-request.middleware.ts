/**
 * Track Request Middleware
 *
 * Logs every incoming card request (stats, languages, graph, badges) to the
 * `stats_requests` table so admins can see who requested what — including
 * programmatic user-agents (python-requests, curl, bots) that previously
 * collapsed into a single row via the old `url` unique index.
 *
 * Growth defences (H7):
 *   - Reject malformed usernames before touching the DB.
 *   - Coalesce identical requests within the same UTC hour via an LRU-capped
 *     Set so a hot badge doesn't produce one row per hit. The DB rows still
 *     represent "at least one visit in this hour bucket".
 *   - Rows older than env.STATS_REQUESTS_RETENTION_DAYS are pruned by a
 *     scheduled job in server.ts (see shared/utils/stats-cleanup.ts).
 */

import type { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';
import { db } from '../../db/index.js';
import { statsRequests } from '../../db/schema.js';
import { createLogger } from '../logs/logger.js';
import { isValidGithubUsername } from '../utils/username.js';

const logger = createLogger({ service: 'TrackRequestMiddleware' });

// Bounded hourly-dedup cache. Each entry is (username|url|user_agent|hour)
// → present. Capacity 20k keeps memory in check even if a viral README
// cycles through many UAs; TTL of ~90 min accommodates clock skew and
// bucket rollover without an explicit sweep.
const HOUR_BUCKET_TTL_MS = 90 * 60 * 1000;
const seenThisHour = new LRUCache<string, true>({
    max: 20_000,
    ttl: HOUR_BUCKET_TTL_MS,
});

function normalizeEndpoint(req: Request): string {
    const entries = Object.entries(req.query)
        .flatMap(([key, value]) => {
            if (value === undefined || value === null) return [];
            if (Array.isArray(value)) {
                return value.map((item) => [key, String(item)] as [string, string]);
            }
            return [[key, String(value)] as [string, string]];
        })
        .sort(([aKey, aVal], [bKey, bVal]) => {
            const keyCompare = aKey.localeCompare(bKey);
            return keyCompare !== 0 ? keyCompare : aVal.localeCompare(bVal);
        });

    const queryString = new URLSearchParams(entries).toString();
    const pathName = `${req.baseUrl}${req.path}`;
    return queryString ? `${pathName}?${queryString}` : pathName;
}

/** Floor `Date.now()` to the hour boundary (UTC). Used as part of the dedup
 * cache key so hits within the same hour collapse to one write. */
function currentHourBucket(): number {
    return Math.floor(Date.now() / (60 * 60 * 1000));
}

export function trackRequest(req: Request, _res: Response, next: NextFunction): void {
    const rawUsername = typeof req.query.username === 'string' ? req.query.username : null;

    // Reject anything that isn't a valid GitHub username — an attacker could
    // otherwise stuff arbitrary text into the table (bloat, log injection,
    // downstream rendering hazards).
    if (!rawUsername || !isValidGithubUsername(rawUsername)) {
        next();
        return;
    }
    const username = rawUsername;

    const url = normalizeEndpoint(req);
    const userAgent = req.get('user-agent') || null;
    const bucket = currentHourBucket();
    const dedupKey = `${username}|${url}|${userAgent ?? ''}|${bucket}`;

    if (seenThisHour.has(dedupKey)) {
        next();
        return;
    }
    seenThisHour.set(dedupKey, true);

    // Fire-and-forget: never block the response on the stats write.
    void (async () => {
        try {
            await db.insert(statsRequests).values({
                username,
                url,
                user_agent: userAgent,
                created_at: Date.now(),
            });
        } catch (err) {
            logger.error('Failed to log request', err as Error, { username, url });
        }
    })();

    next();
}
