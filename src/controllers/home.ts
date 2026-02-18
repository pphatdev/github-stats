import { Request, Response } from 'express';
import { themes } from '../utils/themes.js';
import { Controller } from './controller.js';

export class HomeController extends Controller {
    static get(req: Request, response: Response) {
        const PORT = process.env.PORT || 3102;
        const APP_ENV = process.env.APP_ENV || 'development';
        const PROTOCOL = APP_ENV === 'production' ? 'https' : 'http';
        const host = req.get('host');
        const fullUrl = `${PROTOCOL}://${host}/stats?username=pphatdev&format=webp&avatar_mode=radar`;

        const payloads = {
            ...Controller.defaultConfig,
            port: PORT,
            fullUrl,
            themes: Object.keys(themes)
        };
        response.render('layouts/main', payloads);
    }
}