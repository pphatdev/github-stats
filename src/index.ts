import 'dotenv/config';
import { getGlobalErrorHandlers, setupGracefulShutdown } from './utils/global-error.js';

// Add global error handlers IMMEDIATELY
getGlobalErrorHandlers();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { GitHubClient } from './utils/github-client.js';
import { getRedisClient } from './utils/redis-client.js';
import { getBadgeCacheService } from './services/badge-cache.service.js';
import { warmupRedisCache } from './routes/redis-cached.routes.js';
import { initializeControllers, registerRoutes } from './routes/register.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import cluster from 'cluster';
import { getRoutes } from './routes/docs.routes.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const app = express();

// ⚡️ PERFORMANCE: Enable gzip compression for responses
app.use(compression({ level: 6, threshold: 1024, }));

// 🔒 SECURITY: Manual security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

// Standard middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));
app.use('/public', express.static(publicDir));

const staticRoots = ['/', '/public'];

app.get('/', (_req, res) => {
    res.json({
        routes: getRoutes(app),
        staticAssets: { roots: staticRoots, example: '/sitemap.xml' }
    });
});

const PORT = process.env.PORT || 3000;
const APP_ENV = process.env.APP_ENV || 'development';
const PROTOCOL = APP_ENV === 'production' ? 'https' : 'http';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ENVIRONMENT = process.env.ENVIRONMENT || '';
const isCloudflareEnv = ENVIRONMENT.toLowerCase().includes('cloudflare') || Boolean(process.env.CF_PAGES || process.env.CF_ACCOUNT_ID);
const runtimeTarget = isCloudflareEnv ? 'cloudflare' : 'node';

// Only log warnings from worker 1 or non-cluster mode
const shouldLog = !cluster.isWorker || cluster.worker?.id === 1;

if (!GITHUB_TOKEN && shouldLog) {
    console.warn('⚠️  WARNING: GITHUB_TOKEN is not set!');
    console.warn('⚠️  You will hit rate limits without authentication.');
    console.warn('⚠️  Create a .env file with: GITHUB_TOKEN=your_token_here');
    console.warn('⚠️  Get a token at: https://github.com/settings/tokens');
}

// Initialize Redis (optional - falls back gracefully if not available)
let redis_initialized = false;
let badgeCache_initialized = false;

(async () => {
    try {
        await getRedisClient();
        redis_initialized = true;
        if (shouldLog) console.log('✅ Redis cache initialized');
    } catch (error) {
        if (shouldLog) {
            console.warn('⚠️  Redis not available. Running with in-memory cache only.');
            console.warn('⚠️  To enable Redis: REDIS_URL=redis://localhost:6379');
        }
    }

    // Initialize badge cache service (uses Redis if available)
    try {
        await getBadgeCacheService();
        badgeCache_initialized = true;
        if (shouldLog) console.log('✅ Persistent badge cache initialized');
    } catch (error) {
        if (shouldLog) {
            console.warn('⚠️  Badge cache initialization failed. Using in-memory only.');
        }
    }
})();

const githubClient = new GitHubClient(GITHUB_TOKEN);

// Cache to reduce API calls
const cache = new Map<string, { data: string; timestamp: number }>();
// 2 hours (increased from 20 minutes for better hit rate)
const CACHE_DURATION = 2 * 60 * 60 * 1000;

// Initialize controllers and register routes
initializeControllers(githubClient, cache, CACHE_DURATION);
registerRoutes(app);

app.listen(PORT, () => {
    if (shouldLog) {
        const workerId = cluster.isWorker ? ` (Worker ${cluster.worker?.id})` : '';
        console.log(`🚀 GitHub Stats server running on ${PROTOCOL}://localhost:${PORT}${workerId}`);
        console.log(`📊 Example: ${PROTOCOL}://localhost:${PORT}/stats?username=pphatdev`);
        console.log(`🔧 Environment: ${APP_ENV}`);
        console.log(`🧪 Runtime target: ${runtimeTarget} (ENVIRONMENT=${ENVIRONMENT || 'not-set'})`);
        console.log(`💾 Cache: Redis ${redis_initialized ? '✅' : '⚠️'} | Badges ${badgeCache_initialized ? '✅' : '⚠️'}`);
    }

    const warmupUsername = process.env.WARMUP_USERNAME;
    if (warmupUsername && redis_initialized && shouldLog) {
        warmupRedisCache(warmupUsername, PORT, PROTOCOL).catch((error) => {
            console.warn('⚠️  Redis warm-up failed:', error);
        });
    }
});

// Graceful shutdown
setupGracefulShutdown();