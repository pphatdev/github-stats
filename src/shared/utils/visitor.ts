/**
 * Helpers for visitor dedup on the /badges visitors endpoint.
 *
 * The visitor counter is bumped once per (username, ip_hash, day). A per-
 * instance `SERVER_SALT` is mixed into the IP before hashing so raw IPs
 * never touch storage and hashes aren't portable between deployments.
 */

import { createHash } from 'node:crypto';
import { getEnv } from '../config/env.js';

// Fallback salt used only when SERVER_SALT is unset. The env loader logs a
// warning at boot; this constant exists so dev environments still function.
// Long enough (>= 32 chars) to be indistinguishable from a real salt at the
// hash function's output.
const DEV_FALLBACK_SALT = 'DEV-ONLY-INSECURE-DO-NOT-USE-IN-PROD-6f4b3a2e';

let cachedSalt: string | null = null;

function getSalt(): string {
    if (cachedSalt !== null) return cachedSalt;
    cachedSalt = getEnv().SERVER_SALT ?? DEV_FALLBACK_SALT;
    return cachedSalt;
}

/**
 * Deterministic SHA-256 of `${salt}:${ip}`. Length-fixed, storage-safe.
 * Returns an empty string when the IP is missing so callers can decide to
 * abort the write rather than dedup against a global bucket.
 */
export function hashClientIp(ip: string | null | undefined): string {
    if (!ip) return '';
    return createHash('sha256').update(`${getSalt()}:${ip}`).digest('hex');
}

/**
 * Today's date in `YYYY-MM-DD` (UTC). Aligns with the `visitor_logs.visit_date`
 * column and gives every deployment the same day boundary regardless of TZ.
 */
export function currentVisitDateUtc(): string {
    return new Date().toISOString().slice(0, 10);
}
