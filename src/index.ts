import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GitHubClient } from './utils/github-client.js';
import { StatsController } from './controllers/stats.js';
import { LanguageController } from './controllers/languages.js';
import { GraphController } from './controllers/graph.js';
import { BadgeController } from './controllers/badge.js';
import { getRedisClient, closeRedisClient } from './utils/redis-client.js';
import { registerCachedRoutes } from './routes/redis-cached-routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
app.use(cors());

app.use(express.static(publicDir));
app.use('/public', express.static(publicDir));

const staticRoots = ['/', '/public'];

type RouteInfo = {
    method: string;
    path: string;
    requiredParams?: string[];
    optionalParams?: string[];
    payload?: string | null;
    example?: string;
};

const routeDocs: Record<string, Omit<RouteInfo, 'method' | 'path'>> = {
    'GET /stats': StatsController.routeDocs,
    'GET /languages': LanguageController.routeDocs,
    'GET /graph': GraphController.routeDocs,
    'GET /badge/visitors': BadgeController.routeDocs.visitors,
    'GET /badge/repositories': BadgeController.routeDocs.repositories,
    'GET /badge/organization': BadgeController.routeDocs.organization,
    'GET /badge/languages': BadgeController.routeDocs.languages,
    'GET /badge/followers': BadgeController.routeDocs.followers,
    'GET /badge/total-stars': BadgeController.routeDocs['total-stars'],
    'GET /badge/total-contributors': BadgeController.routeDocs['total-contributors'],
    'GET /badge/total-commits': BadgeController.routeDocs['total-commits'],
    'GET /badge/total-code-reviews': BadgeController.routeDocs['total-code-reviews'],
    'GET /badge/total-issues': BadgeController.routeDocs['total-issues'],
    'GET /badge/total-pull-requests': BadgeController.routeDocs['total-pull-requests'],
    'GET /badge/total-joined-years': BadgeController.routeDocs['total-joined-years'],
};

const getRoutes = (): RouteInfo[] => {
    const routes: RouteInfo[] = [];
    const router = (app as { _router?: { stack?: Array<{ route?: { path?: string; methods?: Record<string, boolean> } } | { name?: string; handle?: { stack?: Array<{ route?: { path?: string; methods?: Record<string, boolean> } }> } }> } })._router;
    const stack = router?.stack ?? [];

    for (const layer of stack) {
        if ('route' in layer && layer.route) {
            const routePath = layer.route.path ?? '';
            const methods = Object.keys(layer.route.methods ?? {}).filter((method) => layer.route?.methods?.[method]);
            for (const method of methods) {
                const routeKey = `${method.toUpperCase()} ${routePath}`;
                routes.push({ method: method.toUpperCase(), path: routePath, ...routeDocs[routeKey] });
            }
        } else if ('name' in layer && layer.name === 'router' && layer.handle?.stack) {
            for (const nestedLayer of layer.handle.stack) {
                if (nestedLayer.route) {
                    const routePath = nestedLayer.route.path ?? '';
                    const methods = Object.keys(nestedLayer.route.methods ?? {}).filter((method) => nestedLayer.route?.methods?.[method]);
                    for (const method of methods) {
                        const routeKey = `${method.toUpperCase()} ${routePath}`;
                        routes.push({ method: method.toUpperCase(), path: routePath, ...routeDocs[routeKey] });
                    }
                }
            }
        }
    }

    routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
    return routes;
};

app.get('/', (_req, res) => {
    res.json({
        routes: getRoutes(),
        staticAssets: {
            roots: staticRoots,
            example: '/sitemap.xml'
        }
    });
});

const PORT = process.env.PORT || 3000;
const APP_ENV = process.env.APP_ENV || 'development';
const PROTOCOL = APP_ENV === 'production' ? 'https' : 'http';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.warn('⚠️  WARNING: GITHUB_TOKEN is not set!');
    console.warn('⚠️  You will hit rate limits without authentication.');
    console.warn('⚠️  Create a .env file with: GITHUB_TOKEN=your_token_here');
    console.warn('⚠️  Get a token at: https://github.com/settings/tokens');
}

// Initialize Redis (optional - falls back gracefully if not available)
let redis_initialized = false;
(async () => {
    try {
        await getRedisClient();
        redis_initialized = true;
        console.log('✅ Redis cache initialized');
    } catch (error) {
        console.warn('⚠️  Redis not available. Running with in-memory cache only.');
        console.warn('⚠️  To enable Redis: REDIS_URL=redis://localhost:6379');
    }
})();

const githubClient = new GitHubClient(GITHUB_TOKEN);

// Cache to reduce API calls
const cache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours (increased from 20 minutes for better hit rate)

// Initialize controllers
StatsController.initialize(githubClient, cache, CACHE_DURATION);
LanguageController.initialize(githubClient, cache, CACHE_DURATION);
GraphController.initialize(githubClient, cache, CACHE_DURATION);
BadgeController.initialize(githubClient, cache, CACHE_DURATION);

registerCachedRoutes(app);

app.listen(PORT, () => {
    console.log(`🚀 GitHub Stats server running on ${PROTOCOL}://localhost:${PORT}`);
    console.log(`📊 Example: ${PROTOCOL}://localhost:${PORT}/stats?username=pphatdev&theme=dark`);
    console.log(`🔧 Environment: ${APP_ENV}`);
    console.log(`💾 Cache: ${redis_initialized ? 'Redis ✅' : 'In-Memory (Map) ⚠️'}`);

    const warmupUsername = process.env.WARMUP_USERNAME;
    if (warmupUsername && redis_initialized) {
        warmupRedisCache(warmupUsername, PORT, PROTOCOL).catch((error) => {
            console.warn('⚠️  Redis warm-up failed:', error);
        });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await closeRedisClient();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await closeRedisClient();
    process.exit(0);
});

async function warmupRedisCache(username: string, port: string | number, protocol: string): Promise<void> {
    const baseUrl = `${protocol}://localhost:${port}`;
    const query = `?username=${encodeURIComponent(username)}`;
    const urls = [
        `${baseUrl}/stats${query}`,
        `${baseUrl}/languages${query}`,
        `${baseUrl}/graph${query}`,
        `${baseUrl}/badge/visitors${query}`,
        `${baseUrl}/badge/repositories${query}`,
        `${baseUrl}/badge/organization${query}`,
        `${baseUrl}/badge/languages${query}`,
        `${baseUrl}/badge/followers${query}`,
        `${baseUrl}/badge/total-stars${query}`,
        `${baseUrl}/badge/total-contributors${query}`,
        `${baseUrl}/badge/total-commits${query}`,
        `${baseUrl}/badge/total-code-reviews${query}`,
        `${baseUrl}/badge/total-issues${query}`,
        `${baseUrl}/badge/total-pull-requests${query}`,
        `${baseUrl}/badge/total-joined-years${query}`,
    ];

    await Promise.all(
        urls.map(async (url) => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Warm-up failed: ${url} (${response.status})`);
                }
            } catch (error) {
                console.warn(`⚠️  Warm-up request failed: ${url}`, error);
            }
        })
    );
}
