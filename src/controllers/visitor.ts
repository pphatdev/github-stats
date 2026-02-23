import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { visitors } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { BadgeRenderer } from '../components/badge-renderer.js';

export class VisitorController {
    static routeDocs = {
        requiredParams: ['username'],
        optionalParams: ['theme', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
        payload: null,
        example: '/badge?username=pphatdev&theme=tokyo&labelColor=ff0000'
    };

    static async getBadge(req: Request, res: Response) {
        try {
            const {
                username,
                theme = 'default',
                labelColor,
                labelBackground,
                valueColor,
                valueBackground
            } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            // Increment or insert visitor count
            const result = await db.insert(visitors)
                .values({ username, count: 1 })
                .onConflictDoUpdate({
                    target: visitors.username,
                    set: { count: sql`${visitors.count} + 1` }
                })
                .returning();

            const count = result[0]?.count || 1;
            const svg = BadgeRenderer.generateBadge(username, count, theme as string, {
                labelColor: labelColor as string | undefined,
                labelBackground: labelBackground as string | undefined,
                valueColor: valueColor as string | undefined,
                valueBackground: valueBackground as string | undefined
            });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Always fresh for counter
            res.send(svg);
        } catch (error) {
            console.error('Error in VisitorController:', error);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
