/**
 * Badges Controller
 * Handles HTTP requests for badge generation
 */

import { Request, Response } from 'express';
import { BadgesService } from './badges.service.js';
import { createLogger } from '../../shared/logs/logger.js';
import type { UserBadgeType, ProjectBadgeType, BadgeOptions, BadgeRouteDoc } from './badges.types.js';

const logger = createLogger({ controller: 'BadgesController' });

const defaultOptionsParams = [
    'theme',
    'customLabel',
    'labelColor',
    'labelBackground',
    'iconColor',
    'valueColor',
    'valueBackground',
    'hideFrame',
    'hideIcon'
] as const;

export class BadgesController {
    private badgesService: BadgesService;

    static userBadgeDocs: Record<UserBadgeType, BadgeRouteDoc> = {
        'visitors': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/visitors?username=pphatdev&theme=tokyo'
        },
        'repositories': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/repositories?username=pphatdev'
        },
        'organization': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/organization?username=pphatdev'
        },
        'languages': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/languages?username=pphatdev'
        },
        'followers': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/followers?username=pphatdev'
        },
        'total-stars': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-stars?username=pphatdev'
        },
        'total-contributors': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-contributors?username=pphatdev'
        },
        'total-commits': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-commits?username=pphatdev'
        },
        'total-code-reviews': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-code-reviews?username=pphatdev'
        },
        'total-issues': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-issues?username=pphatdev'
        },
        'total-pull-requests': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-pull-requests?username=pphatdev'
        },
        'total-joined-years': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-joined-years?username=pphatdev'
        }
    };

    static projectBadgeDocs: Record<ProjectBadgeType, BadgeRouteDoc> = {
        'stars': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/stars?owner=pphatdev&repo=github-stats'
        },
        'forks': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/forks?owner=pphatdev&repo=github-stats'
        },
        'contributors': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/contributors?owner=pphatdev&repo=github-stats'
        },
        'commits': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/commits?owner=pphatdev&repo=github-stats'
        },
        'code-reviews': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/code-reviews?owner=pphatdev&repo=github-stats'
        },
        'issues': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/issues?owner=pphatdev&repo=github-stats'
        },
        'pull-requests': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/pull-requests?owner=pphatdev&repo=github-stats'
        },
        'watchers': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/watchers?owner=pphatdev&repo=github-stats'
        },
        'language': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/language?owner=pphatdev&repo=github-stats'
        },
        'license': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/license?owner=pphatdev&repo=github-stats'
        },
        'size': {
            requiredParams: ['owner', 'repo'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/project/size?owner=pphatdev&repo=github-stats'
        }
    };

    constructor(badgesService: BadgesService) {
        this.badgesService = badgesService;
    }

    /**
     * Get user badge
     */
    async getUserBadge(req: Request, res: Response, type: UserBadgeType): Promise<void> {
        const startTime = Date.now();

        try {
            const { username } = req.query;

            if (!username || typeof username !== 'string') {
                res.status(400).send('Username is required');
                return;
            }

            const options = this.parseOptions(req);
            const badge = await this.badgesService.generateUserBadge(username, type, options);

            const duration = Date.now() - startTime;
            logger.info('User badge generated', { username, type, duration });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', this.badgesService.getCacheControl());
            res.send(badge);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to generate user badge', error as Error, { type, duration });
            res.status(500).send('Failed to generate badge');
        }
    }

    /**
     * Get project badge
     */
    async getProjectBadge(req: Request, res: Response, type: ProjectBadgeType): Promise<void> {
        const startTime = Date.now();

        try {
            const { owner, repo } = req.query;

            if (!owner || typeof owner !== 'string' || !repo || typeof repo !== 'string') {
                res.status(400).send('Owner and repo are required');
                return;
            }

            const options = this.parseOptions(req);
            const badge = await this.badgesService.generateProjectBadge(owner, repo, type, options);

            const duration = Date.now() - startTime;
            logger.info('Project badge generated', { owner, repo, type, duration });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', this.badgesService.getCacheControl());
            res.send(badge);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to generate project badge', error as Error, { type, duration });
            res.status(500).send('Failed to generate badge');
        }
    }

    /**
     * Parse badge options from query parameters
     */
    private parseOptions(req: Request): BadgeOptions {
        const {
            theme,
            customLabel,
            labelColor,
            labelBackground,
            iconColor,
            valueColor,
            valueBackground,
            hideFrame,
            hideIcon
        } = req.query;

        return {
            theme: theme as string,
            customLabel: customLabel as string,
            labelColor: labelColor as string,
            labelBackground: labelBackground as string,
            iconColor: iconColor as string,
            valueColor: valueColor as string,
            valueBackground: valueBackground as string,
            hideFrame: hideFrame === 'true',
            hideIcon: hideIcon === 'true'
        };
    }
}
