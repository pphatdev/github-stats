import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { LanguageCardRenderer } from '../components/language-card.js';
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
            const { username, theme = 'default', show_info, top } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            const cacheKey = `languages-${username}-${theme}-${show_info}-${top}`;
            const cached = LanguageController.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < LanguageController.CACHE_DURATION) {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=600');
                return res.send(cached.data);
            }

            const languages = await LanguageController.githubClient.fetchUserLanguages(username);
            const svg = LanguageCardRenderer.generateLanguagesCard(languages, {
                username,
                theme: theme as string,
                showInfo: show_info !== 'false',
                listLength: typeof top === 'string' ? Math.max(0, Number.parseInt(top, 10) || 0) : 5,
            });

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
