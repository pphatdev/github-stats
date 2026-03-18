import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { LanguageCardRenderer } from '../components/language-card.js';
import { LanguagePieChartRenderer } from '../components/language-pie-chart.js';
export class LanguageController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;
    static routeDocs = {
        requiredParams: ['username'],
        optionalParams: [
            'type',
            'theme',
            'show_info',
            'info_outline'
        ],
        payload: null as null,
        example: '/languages?username=pphatdev&type=card&theme=default'
    };

    static initialize(githubClient: GitHubClient, cache: Map<string, { data: string; timestamp: number }>, cacheDuration: number) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    static async getSvg(req: Request, res: Response) {
        try {
            const { username, type = 'card', theme = 'default', show_info, info_outline = 'solid' } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            const cacheKey = `languages-${username}-${type}-${theme}-${show_info}-${info_outline}`;
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
                    theme: theme as string,
                });
            } else {
                svg = LanguageCardRenderer.generateLanguagesCard(languages, {
                    theme: theme as string,
                    showInfo: show_info !== 'false',
                    dataBorderStyle: info_outline === 'frame' ? 'frame' : 'solid',
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
