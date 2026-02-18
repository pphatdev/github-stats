import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { LanguageCardRenderer } from '../components/language-card.js';
import { LanguagePieChartRenderer } from '../components/language-pie-chart.js';
import { themes } from '../utils/themes.js';
import { Controller } from './controller.js';

export class LanguageController extends Controller {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;

    static initialize(githubClient: GitHubClient, cache: Map<string, { data: string; timestamp: number }>, cacheDuration: number) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    static async get(req: Request, res: Response) {
        try {
            const {
                username,
                theme = 'default',
                show_info = 'true',
                top = '5',
                variant = 'bubbles'
            } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            const params = new URLSearchParams();
            params.set('username', username);
            params.set('format', 'webp');
            if (theme !== 'default') params.set('theme', theme as string);
            if (show_info === 'false') params.set('show_info', 'false');
            if (top) params.set('top', top as string);
            if (variant !== 'bubbles') params.set('variant', variant as string);

            const protocol = req.protocol;
            const host = req.get('host');
            const svgUrl = `/languages?${params.toString()}`;
            const fullUrl = `${protocol}://${host}/languages?${params.toString()}`;

            const payloads = {
                ...Controller.defaultConfig,
                title: `${username}'s GitHub Languages - StackDev`,
                description: `View ${username}'s GitHub language breakdown with customizable themes, top language list, and visualization styles.`,
                keywords: `github languages, github readme, github card, language stats, top languages, svg card, github profile, ${username} languages`,
                page: 'languages',
                username,
                theme,
                showInfo: show_info !== 'false',
                top: Number.parseInt(top as string, 10) || 5,
                variant,
                svgUrl,
                fullUrl,
                themes: Object.keys(themes)
            };

            res.render('layouts/main', payloads);
        } catch (error) {
            console.error('Error rendering languages view:', error);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async getSvg(req: Request, res: Response) {
        try {
            const { username, theme = 'default', show_info, top, variant, type = 'card', format } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            const cacheKey = `languages-${username}-${theme}-${show_info}-${top}-${variant}-${type}`;
            const cached = LanguageController.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < LanguageController.CACHE_DURATION) {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=600');
                return res.send(cached.data);
            }

            const languages = await LanguageController.githubClient.fetchUserLanguages(username);

            let svg: string;
            if (type === 'pie') {
                svg = LanguagePieChartRenderer.generatePieChart(languages, {
                    username,
                    theme: theme as string,
                    listLength: typeof top === 'string' ? Math.max(0, Number.parseInt(top, 10) || 8) : 8,
                });
            } else {
                svg = LanguageCardRenderer.generateLanguagesCard(languages, {
                    username,
                    theme: theme as string,
                    showInfo: show_info !== 'false',
                    listLength: typeof top === 'string' ? Math.max(0, Number.parseInt(top, 10) || 5) : 5,
                    variant: variant as 'bubbles' | 'pie' | undefined,
                });
            }

            LanguageController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(svg);
        } catch (error) {
            console.error('Error generating languages background:', error);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
