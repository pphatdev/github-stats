/**
 * Vercel Serverless Entry Point
 * Bootstraps the Express app for Vercel's serverless runtime.
 * Does NOT call app.listen() — Vercel handles the HTTP server.
 */

import { createApp, initializeRoutes, setupErrorHandlers } from '../src/app.js';
import { getEnv } from '../src/shared/config/env.js';
import { GitHubClient } from '../src/shared/utils/github-client.js';
import { initializeDatabase } from '../src/shared/config/db.js';

const env = getEnv();
const githubClient = new GitHubClient(env.GITHUB_TOKEN);
const cache = new Map<string, { data: string; timestamp: number }>();

// Initialize database (uses Cloudflare D1 when DATABASE_PROVIDER=cloudflare)
try {
    initializeDatabase();
} catch (error) {
    console.warn('Database initialization skipped:', (error as Error).message);
}

const app = createApp();
initializeRoutes(app, githubClient, cache, env.CACHE_DURATION);
setupErrorHandlers(app);

export default app;
