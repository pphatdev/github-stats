import { Request, Response } from 'express';
import { themes } from '../utils/themes.js';
import { Controller } from './controller.js';

export class HomeController extends Controller {
    static get(req: Request, response: Response) {
        const PORT = process.env.PORT || 3000;
        const payloads = {
            ...Controller.defaultConfig,
            port: PORT,
            themes: Object.keys(themes)
        };
        response.render('layouts/main', payloads);
    }
}