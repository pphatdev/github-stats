import { Request, Response } from 'express';
import { Controller } from './controller.js';
import { themes } from '../utils/themes.js';

export class StudioController extends Controller {
    static async get(req: Request, res: Response) {
        try {
            const config = {
                ...StudioController.defaultConfig,
                title: 'SVG Studio - Customize & Design GitHub Stats Cards',
                description: 'Design and customize your SVG cards with our interactive studio. Real-time preview, color picker, custom styles, and instant export.',
                keywords: 'svg editor, svg customization, github card designer, svg studio, card creator, svg builder, design tool',
                page: 'studio',
                themes: JSON.stringify(themes)
            };

            res.render('layouts/main', config);
        } catch (error) {
            console.error('Error rendering studio page:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async exportSvg(req: Request, res: Response) {
        try {
            const { svgContent, filename = 'custom-card.svg' } = req.body;

            if (!svgContent) {
                return res.status(400).json({ error: 'SVG content is required' });
            }

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(svgContent);
        } catch (error) {
            console.error('Error exporting SVG:', error);
            res.status(500).json({ error: 'Failed to export SVG' });
        }
    }
}
