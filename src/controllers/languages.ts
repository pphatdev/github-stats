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
            'theme',
            'show_info',
            'top',
            'variant',
            'type',
            'bgColor',
            'borderColor',
            'textColor',
            'titleColor',
            'format'
        ],
        payload: null as null,
        example: '/languages?username=pphatdev&theme=default'
    };

    static initialize(githubClient: GitHubClient, cache: Map<string, { data: string; timestamp: number }>, cacheDuration: number) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    static async getSvg(req: Request, res: Response) {
        try {
            const { username, theme = 'default', show_info, top, variant, type = 'card', bgColor, borderColor, textColor, titleColor, format } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            const cacheKey = `languages-${username}-${theme}-${show_info}-${top}-${variant}-${type}-${bgColor || ''}-${borderColor || ''}-${textColor || ''}-${titleColor || ''}`;
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
                    listLength: typeof top === 'string' ? Math.max(0, Number.parseInt(top, 10) || 8) : 8,
                    bgColor: bgColor as string | undefined,
                    borderColor: borderColor as string | undefined,
                    textColor: textColor as string | undefined,
                    titleColor: titleColor as string | undefined,
                });
            } else {
                svg = LanguageCardRenderer.generateLanguagesCard(languages, {
                    theme: theme as string,
                    showInfo: show_info !== 'false',
                    listLength: typeof top === 'string' ? Math.max(0, Number.parseInt(top, 10) || 5) : 5,
                    variant: variant as 'bubbles' | 'pie' | undefined,
                    bgColor: bgColor as string | undefined,
                    borderColor: borderColor as string | undefined,
                    textColor: textColor as string | undefined,
                    titleColor: titleColor as string | undefined,
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
