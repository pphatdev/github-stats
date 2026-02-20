import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { GraphRenderer } from '../components/graph-renderer.js';

export class GraphController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;

    static routeDocs = {
        requiredParams: ['username'],
        optionalParams: [
            'theme',
            'year',
            'animate',
            'bgColor',
            'borderColor',
            'textColor',
            'titleColor'
        ],
        payload: null,
        example: '/graph?username=pphatdev&animate=wave'
    };

    static initialize(githubClient: GitHubClient, cache: Map<string, { data: string; timestamp: number }>, cacheDuration: number) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    static async getSvg(req: Request, res: Response) {
        try {
            const { username, theme = 'default', year, animate, bgColor, borderColor, textColor, titleColor } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            let from: string;
            let to: string;
            let cacheKeyExtra: string;
            let displayYear: string | number;

            if (year) {
                const y = parseInt(year as string, 10);
                from = `${y}-01-01T00:00:00Z`;
                to = `${y}-12-31T23:59:59Z`;
                cacheKeyExtra = y.toString();
                displayYear = y;
            } else {
                const now = new Date();
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(now.getFullYear() - 1);

                from = oneYearAgo.toISOString();
                to = now.toISOString();
                cacheKeyExtra = 'last-year';
                displayYear = `${oneYearAgo.getFullYear()}-${now.getFullYear()}`;
            }

            const cacheKey = `graph-${username}-${theme}-${cacheKeyExtra}-${animate || ''}-${bgColor || ''}-${borderColor || ''}-${textColor || ''}-${titleColor || ''}`;
            const cached = GraphController.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < GraphController.CACHE_DURATION) {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=600');
                return res.send(cached.data);
            }

            const contributions = await GraphController.githubClient.fetchUserContributions(username, from, to, cacheKeyExtra);

            const svg = GraphRenderer.generateGraphCard({ ...contributions, year: displayYear }, {
                theme: theme as string,
                animate: animate as 'none' | 'glow' | 'wave' | 'pulse' | undefined,
                bgColor: bgColor as string | undefined,
                borderColor: borderColor as string | undefined,
                textColor: textColor as string | undefined,
                titleColor: titleColor as string | undefined,
            });

            GraphController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(svg);
        } catch (error) {
            console.error('Error generating graph:', error);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
