import { Request, Response } from 'express';

export class HomeController {
    static get(req: Request, res: Response) {
        const PORT = process.env.PORT || 3000;
        res.render('index', { port: PORT });
    }
}