import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GitHubClient } from './utils/github-client.js';
import { StatsController } from './controllers/stats.js';
import { LanguageController } from './controllers/languages.js';
import { GraphController } from './controllers/graph.js';
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
    'GET /graph': GraphController.routeDocs
};

const getRoutes = (): RouteInfo[] => {
    const routes: RouteInfo[] = [];
    const router = (app as { _router?: { stack?: Array<{ route?: { path?: string; methods?: Record<string, boolean> } } | { name?: string; handle?: { stack?: Array<{ route?: { path?: string; methods?: Record<string, boolean> } }> } }> } })._router;
    const stack = router?.stack ?? [];

    for (const layer of stack) {
        if ('route' in layer && layer.route) {
            const path = layer.route.path ?? '';
            const methods = Object.keys(layer.route.methods ?? {}).filter((method) => layer.route?.methods?.[method]);
            for (const method of methods) {
                const routeKey = `${method.toUpperCase()} ${path}`;
                routes.push({ method: method.toUpperCase(), path, ...routeDocs[routeKey] });
            }
        } else if ('name' in layer && layer.name === 'router' && layer.handle?.stack) {
            for (const nestedLayer of layer.handle.stack) {
                if (nestedLayer.route) {
                    const path = nestedLayer.route.path ?? '';
                    const methods = Object.keys(nestedLayer.route.methods ?? {}).filter((method) => nestedLayer.route?.methods?.[method]);
                    for (const method of methods) {
                        const routeKey = `${method.toUpperCase()} ${path}`;
                        routes.push({ method: method.toUpperCase(), path, ...routeDocs[routeKey] });
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

const githubClient = new GitHubClient(GITHUB_TOKEN);

// Cache to reduce API calls
const cache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

// Initialize controllers
StatsController.initialize(githubClient, cache, CACHE_DURATION);
LanguageController.initialize(githubClient, cache, CACHE_DURATION);
GraphController.initialize(githubClient, cache, CACHE_DURATION);

// API Request
app.get('/stats', StatsController.getSvg);
app.get('/languages', LanguageController.getSvg);
app.get('/graph', GraphController.getSvg);

app.listen(PORT, () => {
    console.log(`🚀 GitHub Stats server running on ${PROTOCOL}://localhost:${PORT}`);
    console.log(`📊 Example: ${PROTOCOL}://localhost:${PORT}/stats?username=pphatdev&theme=dark`);
    console.log(`🔧 Environment: ${APP_ENV}`);
});
