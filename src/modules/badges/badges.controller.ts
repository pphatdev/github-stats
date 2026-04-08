/**
 * Badges Controller
 * Handles the unified query-style badge API.
 */

import { Request, Response } from 'express';
import { BadgesService } from './badges.service.js';
import { createLogger } from '../../shared/logs/logger.js';
import type {
    BadgeEffect,
    BadgeName,
    BadgeOptions,
    BadgeQueryParams,
    BadgeSize,
    ProjectBadgeType,
    UserBadgeType,
} from './badges.types.js';

const logger = createLogger({ controller: 'BadgesController' });

const USER_BADGE_TYPES: readonly UserBadgeType[] = [
    'visitors',
    'repositories',
    'organization',
    'languages',
    'followers',
    'total-stars',
    'total-contributors',
    'total-commits',
    'total-code-reviews',
    'total-issues',
    'total-pull-requests',
    'total-joined-years',
] as const;

const PROJECT_BADGE_TYPES: readonly ProjectBadgeType[] = [
    'stars',
    'forks',
    'contributors',
    'issues',
    'pull-requests',
    'watchers',
    'size',
] as const;

const PROJECT_RENDERER_TYPES: Record<ProjectBadgeType, string> = {
    stars: 'repo-stars',
    forks: 'repo-forks',
    contributors: 'repo-contributors',
    issues: 'repo-issues',
    'pull-requests': 'repo-prs',
    watchers: 'repo-watchers',
    size: 'repo-size',
    commits: 'repo-size',
    'code-reviews': 'repo-size',
    language: 'repo-size',
    license: 'repo-size',
};

const SUPPORTED_BADGE_NAMES: readonly BadgeName[] = [
    ...USER_BADGE_TYPES,
    ...PROJECT_BADGE_TYPES,
] as const;

export class BadgesController {
    constructor(private readonly badgesService: BadgesService) {}

    async getBadges(req: Request<unknown, unknown, unknown, BadgeQueryParams>, res: Response): Promise<void> {
        const startTime = Date.now();

        try {
            const username = this.getTrimmedString(req.query.username);
            if (!username) {
                res.status(400).json({
                    error: 'username is required',
                    route: this.getRoutePattern(),
                });
                return;
            }

            const rawNames = this.parseCsv(req.query.name);
            if (rawNames.length === 0) {
                res.json(this.getDiscoveryPayload());
                return;
            }

            const invalidNames = rawNames.filter((name) => !this.isBadgeName(name));
            if (invalidNames.length > 0) {
                res.status(400).json({
                    error: 'Invalid badge name',
                    invalidNames,
                    supported: this.getSupportedNames(),
                });
                return;
            }

            const names = rawNames as BadgeName[];

            const repo = this.getTrimmedString(req.query.repo);
            const projectNames = names.filter((name): name is ProjectBadgeType => this.isProjectBadgeType(name));
            if (projectNames.length > 0 && !repo) {
                res.status(400).json({
                    error: 'repo is required for repository badges',
                    namesRequiringRepo: projectNames,
                });
                return;
            }

            const themes = this.parseCsv(req.query.theme);
            const effect = this.parseEffect(req.query.effect);
            const size = this.parseSize(req.query.size);
            const column = this.parseClampedNumber(req.query.column, 50, 1, 50);
            const baseOptions = this.parseBaseOptions(req);

            const badges = await Promise.all(
                names.map((name, index) => this.generateBadge(name, username, repo, {
                    ...baseOptions,
                    theme: this.resolveTheme(themes, index),
                    customType: this.resolveRendererType(name),
                })),
            );

            const svg = this.combineBadges(badges, { column, effect, size, padding: baseOptions.padding || 0 });

            const duration = Date.now() - startTime;
            logger.info('Unified badges generated', {
                username,
                repo,
                names,
                effect,
                size,
                column,
                duration,
            });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', this.badgesService.getCacheControl());
            res.send(svg);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to generate unified badges', error as Error, { duration });
            res.status(500).json({ error: 'Failed to generate badges' });
        }
    }

    private async generateBadge(
        name: BadgeName,
        username: string,
        repo: string | undefined,
        options: BadgeOptions,
    ): Promise<string> {
        if (this.isUserBadgeType(name)) {
            return this.badgesService.generateUserBadge(username, name, options);
        }

        const projectTarget = this.resolveProjectTarget(username, repo!);
        return this.badgesService.generateProjectBadge(projectTarget.owner, projectTarget.repo, name, options);
    }

    private resolveProjectTarget(defaultOwner: string, repoParam: string): { owner: string; repo: string } {
        const normalized = repoParam.trim().replace(/^\/+|\/+$/g, '');
        const parts = normalized.split('/').filter(Boolean);

        // Support both:
        // - repo=my-repo          => owner defaults to username
        // - repo=owner/my-repo    => owner/repo from query
        if (parts.length >= 2) {
            return {
                owner: parts[0],
                repo: parts.slice(1).join('/'),
            };
        }

        return {
            owner: defaultOwner,
            repo: normalized,
        };
    }

    private getDiscoveryPayload() {
        return {
            route: this.getRoutePattern(),
            required: ['username'],
            optional: ['repo', 'name', 'theme', 'effect', 'column', 'size', 'p'],
            supported: this.getSupportedNames(),
            examples: [
                '/badges?username=pphatdev&name=visitors,total-stars',
                '/badges?username=pphatdev&name=visitors,total-stars,repositories&theme=ocean,aurora&effect=wave&column=2&size=medium',
                '/badges?username=pphatdev&repo=github-stats&name=visitors,stars,forks&theme=galaxy,ocean&effect=glow&column=3&size=large',
            ],
        };
    }

    private getRoutePattern(): string {
        return '/badges?username={username}&repo={repo}&name={visitors,total-stars,...}&theme={theme1,theme2,...}&effect={wave|glow}&column={1-50}&size={small|medium|large}&p={0-100}';
    }

    private getSupportedNames() {
        return {
            user: USER_BADGE_TYPES,
            repo: PROJECT_BADGE_TYPES,
        };
    }

    private parseBaseOptions(req: Request<unknown, unknown, unknown, BadgeQueryParams>): BadgeOptions {
        const {
            customLabel,
            labelColor,
            labelBackground,
            iconColor,
            valueColor,
            valueBackground,
            hideFrame,
            realtime,
            p,
        } = req.query;

        return {
            customLabel: this.getTrimmedString(customLabel),
            labelColor: this.getTrimmedString(labelColor),
            labelBackground: this.getTrimmedString(labelBackground),
            iconColor: this.getTrimmedString(iconColor),
            valueColor: this.getTrimmedString(valueColor),
            valueBackground: this.getTrimmedString(valueBackground),
            hideFrame: this.parseBooleanFlag(hideFrame),
            realtime: this.parseBooleanFlag(realtime),
            padding: this.parseClampedNumber(p, 0, 0, 100),
        };
    }

    private parseCsv(value: unknown): string[] {
        if (typeof value !== 'string') {
            return [];
        }

        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    private getTrimmedString(value: unknown): string | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    private resolveTheme(themes: string[], index: number): string | undefined {
        if (themes.length === 0) {
            return 'default';
        }

        return themes[index % themes.length];
    }

    private parseEffect(value: unknown): BadgeEffect | undefined {
        return value === 'wave' || value === 'glow' ? value : undefined;
    }

    private parseSize(value: unknown): BadgeSize {
        return value === 'medium' || value === 'large' ? value : 'small';
    }

    private parseClampedNumber(value: unknown, fallback: number, min: number, max: number): number {
        if (typeof value !== 'string') {
            return fallback;
        }

        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed)) {
            return fallback;
        }

        return Math.min(max, Math.max(min, parsed));
    }

    private parseBooleanFlag(value: unknown): boolean {
        return value === true || value === 'true';
    }

    private isUserBadgeType(value: string): value is UserBadgeType {
        return (USER_BADGE_TYPES as readonly string[]).includes(value);
    }

    private isProjectBadgeType(value: string): value is ProjectBadgeType {
        return (PROJECT_BADGE_TYPES as readonly string[]).includes(value);
    }

    private isBadgeName(value: string): value is BadgeName {
        return (SUPPORTED_BADGE_NAMES as readonly string[]).includes(value);
    }

    private resolveRendererType(name: BadgeName): string {
        if (this.isUserBadgeType(name)) {
            return name;
        }

        return PROJECT_RENDERER_TYPES[name];
    }

    private combineBadges(
        badges: string[],
        options: { column: number; effect?: BadgeEffect; size: BadgeSize; padding: number },
    ): string {
        const scale = this.getScale(options.size);
        const gap = this.getGap(options.size);
        const columnCount = Math.max(1, Math.min(options.column, 50));
        const rowCount = Math.ceil(badges.length / columnCount);
        const actualColumnCount = Math.min(columnCount, badges.length);

        const svgParts = badges.map((badge, index) => this.extractSvgParts(badge, `badge-${index}`));
        const widths = new Array(actualColumnCount).fill(0);
        const heights = new Array(rowCount).fill(0);

        svgParts.forEach((part, index) => {
            const row = Math.floor(index / columnCount);
            const col = index % columnCount;
            const scaledWidth = Math.ceil(part.width * scale);
            const scaledHeight = Math.ceil(part.height * scale);

            if (col < actualColumnCount) {
                widths[col] = Math.max(widths[col], scaledWidth);
            }
            heights[row] = Math.max(heights[row], scaledHeight);
        });

        const xOffsets: number[] = [];
        let xCursor = 0;
        for (let i = 0; i < actualColumnCount; i++) {
            xOffsets.push(xCursor);
            xCursor += widths[i] + (i < actualColumnCount - 1 ? gap : 0);
        }

        const yOffsets: number[] = [];
        let yCursor = 0;
        for (let i = 0; i < rowCount; i++) {
            yOffsets.push(yCursor);
            yCursor += heights[i] + (i < rowCount - 1 ? gap : 0);
        }

        const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, actualColumnCount - 1) * gap + options.padding * 2;
        const totalHeight = heights.reduce((sum, height) => sum + height, 0) + Math.max(0, rowCount - 1) * gap + options.padding * 2;

        const defs = options.effect === 'glow'
            ? '<defs><filter id="badge-stack-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
            : '';

        const groups = svgParts.map((part, index) => {
            const row = Math.floor(index / columnCount);
            const col = index % columnCount;
            const x = xOffsets[col] + options.padding;
            const y = yOffsets[row] + options.padding;
            const filterAttr = options.effect === 'glow' ? ' filter="url(#badge-stack-glow)"' : '';
            const animatedTransform = options.effect === 'wave'
                ? `<animateTransform attributeName="transform" type="translate" values="${x} ${y}; ${x} ${Math.max(0, y - 3)}; ${x} ${y}; ${x} ${y + 3}; ${x} ${y}" dur="2.4s" begin="${(index * 0.12).toFixed(2)}s" repeatCount="indefinite"/>`
                : '';
            const transformAttr = options.effect === 'wave' ? '' : ` transform="translate(${x} ${y})"`;

            return `<g${transformAttr}${filterAttr}>${animatedTransform}<g transform="scale(${scale})">${part.content}</g></g>`;
        }).join('');

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" fill="none">${defs}${groups}</svg>`;
    }

    private getScale(size: BadgeSize): number {
        switch (size) {
            case 'small':
                return 0.85;
            case 'large':
                return 1.2;
            default:
                return 1;
        }
    }

    private getGap(size: BadgeSize): number {
        switch (size) {
            case 'small':
                return 6;
            case 'large':
                return 10;
            default:
                return 8;
        }
    }

    private extractSvgParts(svg: string, suffix: string): { width: number; height: number; content: string } {
        const widthMatch = svg.match(/\bwidth="([0-9]+(?:\.[0-9]+)?)"/i);
        const heightMatch = svg.match(/\bheight="([0-9]+(?:\.[0-9]+)?)"/i);
        const content = svg
            .replace(/^\s*<svg[^>]*>/i, '')
            .replace(/<\/svg>\s*$/i, '');

        return {
            width: widthMatch ? Number.parseFloat(widthMatch[1]) : 120,
            height: heightMatch ? Number.parseFloat(heightMatch[1]) : 34,
            content: this.namespaceIds(content, suffix),
        };
    }

    private namespaceIds(content: string, suffix: string): string {
        const ids = Array.from(content.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);

        return ids.reduce((output, id) => {
            const nextId = `${id}-${suffix}`;
            return output
                .split(`id="${id}"`).join(`id="${nextId}"`)
                .split(`url(#${id})`).join(`url(#${nextId})`);
        }, content);
    }
}
