import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { CardRenderer } from '../components/card-renderer.js';
import { themes } from '../utils/themes.js';
import { Controller } from './controller.js';

export class StatsController extends Controller {
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
                hide_title,
                hide_border,
                hide_rank,
                show_icons,
                avatar_mode = 'none',
                show_avatar,
                custom_title,
                data_border_style = 'solid',
                data_border_frame = 'out'
            } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            // Backward compatibility: convert show_avatar to avatar_mode
            let finalAvatarMode = avatar_mode as string;
            if (show_avatar === 'true') {
                finalAvatarMode = 'avatar';
            }

            // Check cache
            const cacheKey = `${username}-${theme}-${hide_title}-${hide_border}-${hide_rank}-${show_icons}-${finalAvatarMode}-${custom_title}-${data_border_style}-${data_border_frame}`;
            const cached = StatsController.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < StatsController.CACHE_DURATION) {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=600');
                return res.send(cached.data);
            }

            // Fetch stats
            const stats = await StatsController.githubClient.fetchUserStats(username);

            // Generate card
            const card = CardRenderer.generateStatsCard(stats, {
                username,
                theme: theme as string,
                hideTitle: hide_title === 'true',
                hideBorder: hide_border === 'true',
                hideRank: hide_rank === 'true',
                showIcons: show_icons !== 'false',
                avatarMode: finalAvatarMode as 'none' | 'avatar' | 'radar',
                customTitle: custom_title as string | undefined,
                dataBorderStyle: data_border_style as 'solid' | 'frame',
                dataBorderFramePosition: data_border_frame as 'in' | 'out',
            });

            // Cache the result
            StatsController.cache.set(cacheKey, { data: card, timestamp: Date.now() });

            // Send response
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(card);
        } catch (error) {
            console.error('Error generating stats:', error);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async view(req: Request, res: Response) {
        try {
            const {
                username,
                theme = 'default',
                hide_title = 'false',
                hide_border = 'false',
                hide_rank = 'false',
                show_icons = 'true',
                avatar_mode = 'none',
                data_border_style = 'solid',
                data_border_frame = 'out',
                custom_title
            } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            // Build the SVG URL
            const params = new URLSearchParams();
            params.set('username', username);
            if (theme !== 'default') params.set('theme', theme as string);
            if (hide_title === 'true') params.set('hide_title', 'true');
            if (hide_border === 'true') params.set('hide_border', 'true');
            if (hide_rank === 'true') params.set('hide_rank', 'true');
            if (show_icons !== 'true') params.set('show_icons', 'false');
            if (avatar_mode !== 'none') params.set('avatar_mode', avatar_mode as string);
            if (data_border_style !== 'solid') params.set('data_border_style', data_border_style as string);
            if (data_border_frame !== 'out') params.set('data_border_frame', data_border_frame as string);
            if (custom_title) params.set('custom_title', custom_title as string);

            const protocol = req.protocol;
            const host = req.get('host');
            const svgUrl = `/stats?${params.toString()}`;
            const fullUrl = `${protocol}://${host}${svgUrl}`;

            const payloads = {
                ...Controller.defaultConfig,
                title: `${username}'s GitHub Stats - StackDev`,
                description: `View ${username}'s GitHub statistics with customizable themes and options. Generate dynamic SVG cards for your README or profile.`,
                keywords: `github stats, github readme, github card, github statistics, readme stats, github api, svg card, github profile, developer stats, contribution tracker, ${username} stats`,
                page: 'stats',
                username,
                theme,
                hideTitle: hide_title === 'true',
                hideBorder: hide_border === 'true',
                hideRank: hide_rank === 'true',
                showIcons: show_icons === 'true',
                avatarMode: avatar_mode,
                dataBorderStyle: data_border_style,
                dataBorderFramePosition: data_border_frame,
                customTitle: custom_title || '',
                svgUrl,
                fullUrl,
                themes: Object.keys(themes)
            }

            res.render('layouts/main', payloads);
        } catch (error) {
            console.error('Error rendering stats view:', error);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

}
