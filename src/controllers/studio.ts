import { Request, Response } from 'express';
import { themes } from '../utils/themes.js';
import { Controller } from './controller.js';

export class StudioController extends Controller {
    static get(req: Request, response: Response) {
        const PORT = process.env.PORT || 3000;
        const APP_ENV = process.env.APP_ENV || 'development';
        const PROTOCOL = APP_ENV === 'production' ? 'https' : 'http';
        const host = req.get('host');
        const fullUrl = `${PROTOCOL}://${host}/studio`;

        const payloads = {
            ...Controller.defaultConfig,
            page: 'studio',
            port: PORT,
            fullUrl,
            themes: JSON.stringify(themes)
        };
        response.render('layouts/main', payloads);
    }
}
