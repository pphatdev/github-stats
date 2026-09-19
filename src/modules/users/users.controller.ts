/**
 * Users Controller
 * Handles HTTP requests for the users listing endpoint.
 */

import type { Request, Response } from 'express';
import { UsersService } from './users.service.js';
import { createLogger } from '../../shared/logs/logger.js';
import { isValidGithubUsername } from '../../shared/utils/username.js';
import type { UserListQueryParams } from './users.types.js';

const logger = createLogger({ controller: 'UsersController' });

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 500;

export class UsersController {
    private usersService: UsersService;

    constructor(usersService: UsersService) {
        this.usersService = usersService;
    }

    async listUsers(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query as UserListQueryParams;

            const parsedLimit = Number.parseInt(query.limit ?? '', 10);
            const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
                ? Math.min(parsedLimit, MAX_LIMIT)
                : DEFAULT_LIMIT;

            // Accept either `page` (1-based) or `offset`. `page` wins when both are supplied.
            const parsedPage = Number.parseInt(query.page ?? '', 10);
            const parsedOffset = Number.parseInt(query.offset ?? '', 10);

            let offset: number;
            if (Number.isFinite(parsedPage) && parsedPage > 0) {
                offset = (parsedPage - 1) * limit;
            } else if (Number.isFinite(parsedOffset) && parsedOffset >= 0) {
                offset = parsedOffset;
            } else {
                offset = 0;
            }

            const result = await this.usersService.listUsers(limit, offset);

            res.setHeader('Cache-Control', 'public, max-age=60');
            res.json(result);
        } catch (error) {
            logger.error('Failed to list users', error as Error);
            res.status(500).json({ error: 'Failed to list users' });
        }
    }

    async getUserBadge(req: Request, res: Response): Promise<void> {
        const username = (req.params.username ?? '').trim();

        if (!isValidGithubUsername(username)) {
            res.status(400).json({ error: 'Invalid username' });
            return;
        }

        try {
            const badge = await this.usersService.getUserBadge(username);

            if (!badge) {
                res.status(404).json({ error: 'Badge not found for user', username });
                return;
            }

            res.setHeader('Cache-Control', 'public, max-age=60');
            res.json(badge);
        } catch (error) {
            logger.error('Failed to get user badge', error as Error, { username });
            res.status(500).json({ error: 'Failed to get user badge' });
        }
    }
}
