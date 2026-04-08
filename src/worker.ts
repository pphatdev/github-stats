import { initializeD1 } from './db/index.js';

// Minimal Cloudflare Workers type stubs.
// Replace with `import type { ... } from '@cloudflare/workers-types'` once
// you have run `npm install` (the package is already in devDependencies).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1Database = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KVNamespace = any;
interface ExecutionContext {
	waitUntil(promise: Promise<unknown>): void;
	passThroughOnException(): void;
}

export interface Env {
	/** Cloudflare D1 database binding — declared in wrangler.toml [[d1_databases]] */
	DB: D1Database;
	/** KV namespace for general stats caching */
	bind_stats: KVNamespace;
	/** KV namespace for badge/response caching */
	bind_stats_cache: KVNamespace;
	ENVIRONMENT?: string;
	GITHUB_TOKEN?: string;
	DEBUG?: string;
}

// ── Response helpers ──────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body, null, 2), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
}

function svgResponse(body: string): Response {
	return new Response(body, {
		headers: {
			'content-type': 'image/svg+xml; charset=utf-8',
			'cache-control': 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400',
		},
	});
}

// ── Worker entry ──────────────────────────────────────────────────────────────

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		// Initialize Cloudflare D1 before any route handler runs.
		// This populates the shared `db` proxy used by all service modules.
		initializeD1(env.DB);

		const url = new URL(request.url);
		const { pathname } = url;
		const params = Object.fromEntries(url.searchParams) as Record<string, string>;
		const cacheDuration = 7_200_000; // 2 h

		try {
			// ── /health ───────────────────────────────────────────────────────
			if (pathname === '/health' || pathname === '/health/') {
				return json({ status: 'ok', environment: env.ENVIRONMENT ?? 'cloudflare' });
			}

			// ── /badge or /badges ──────────────────────────────────────────────
			if (pathname.startsWith('/badge')) {
				const { BadgesService } = await import('./modules/badges/badges.service.js');
				const { GitHubClient } = await import('./shared/utils/github-client.js');
				const service = new BadgesService(
					new GitHubClient(env.GITHUB_TOKEN),
					new Map(),
					cacheDuration,
				);
				const username = params.username ?? '';
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const type = (params.type as any) ?? 'visitors';
				const result = await service.generateUserBadge(username, type, params);
				return svgResponse(result);
			}

			// ── /stats ────────────────────────────────────────────────────────
			if (pathname.startsWith('/stats')) {
				const { StatsService } = await import('./modules/stats/stats.service.js');
				const { GitHubClient } = await import('./shared/utils/github-client.js');
				const service = new StatsService(
					new GitHubClient(env.GITHUB_TOKEN),
					new Map(),
					cacheDuration,
				);
				const result = await service.generateSvg(params as any);
				return svgResponse(result);
			}

			// ── /graph ────────────────────────────────────────────────────────
			if (pathname.startsWith('/graph')) {
				const { GraphsService } = await import('./modules/graphs/graphs.service.js');
				const { GitHubClient } = await import('./shared/utils/github-client.js');
				const service = new GraphsService(
					new GitHubClient(env.GITHUB_TOKEN),
					new Map(),
					cacheDuration,
				);
				const result = await service.generateGraph(params as any);
				return svgResponse(result);
			}

			// ── /languages ────────────────────────────────────────────────────
			if (pathname.startsWith('/languages')) {
				const { LanguagesService } = await import('./modules/languages/languages.service.js');
				const { GitHubClient } = await import('./shared/utils/github-client.js');
				const service = new LanguagesService(
					new GitHubClient(env.GITHUB_TOKEN),
					new Map(),
					cacheDuration,
				);
				const result = await service.generateLanguageVisualization(params as any);
				return svgResponse(result);
			}

			// ── /icons ────────────────────────────────────────────────────────
			if (pathname.startsWith('/icons')) {
				const { IconsService } = await import('./modules/icons/icons.service.js');
				const service = new IconsService();
				const iconName = params.name ?? '';
				const { content } = await service.getIcon(iconName, params.color);
				return svgResponse(content);
			}

			return json({ error: 'Not Found', path: pathname }, 404);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return json({ error: 'Internal Server Error', message }, 500);
		}
	},
};

