import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { GraphRenderer } from '../components/graph-renderer.js';
import sharp from 'sharp';
import { createRequire } from 'module';
import { PNG } from 'pngjs';
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GIFEncoder = _require('gifencoder') as any;

export class GraphController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;

    static routeDocs = {
        requiredParams: ['username'],
        optionalParams: [
            'theme',
            'year',
            'animate',
            'size',
            'as',
            'show_title',
            'show_total_contribution',
            'show_background',
            'bgColor',
            'borderColor',
            'textColor',
            'titleColor'
        ],
        payload: null,
        example: '/graph?username=pphatdev&animate=wave'
    };

    static initialize(githubClient: GitHubClient, cache: Map<string, { data: string; timestamp: number }>, cacheDuration: number) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    static async getSvg(req: Request, res: Response) {
        try {
            const { username, theme = 'default', year, animate, size, as: outputFormat, show_title, show_total_contribution, show_background, bgColor, borderColor, textColor, titleColor } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            let from: string;
            let to: string;
            let cacheKeyExtra: string;
            let displayYear: string | number;

            if (year) {
                const y = parseInt(year as string, 10);
                from = `${y}-01-01T00:00:00Z`;
                to = `${y}-12-31T23:59:59Z`;
                cacheKeyExtra = y.toString();
                displayYear = y;
            } else {
                const now = new Date();
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(now.getFullYear() - 1);

                from = oneYearAgo.toISOString();
                to = now.toISOString();
                cacheKeyExtra = 'last-year';
                displayYear = `${oneYearAgo.getFullYear()}-${now.getFullYear()}`;
            }

            const format = typeof outputFormat === 'string' ? outputFormat.toLowerCase() : 'svg';
            const cacheKey = `graph-${username}-${theme}-${cacheKeyExtra}-${animate || ''}-${size || ''}-${show_title ?? ''}-${show_total_contribution ?? ''}-${show_background ?? ''}-${bgColor || ''}-${borderColor || ''}-${textColor || ''}-${titleColor || ''}`;

            const contributions = await GraphController.githubClient.fetchUserContributions(username, from, to, cacheKeyExtra);

            const cardOptions = {
                theme: theme as string,
                animate: animate as 'none' | 'glow' | 'wave' | 'pulse' | undefined,
                size: size as 'small' | 'medium' | 'large' | 'default' | undefined,
                show_title: show_title === 'false' ? false : true,
                show_total_contribution: show_total_contribution === 'false' ? false : true,
                show_background: show_background === 'false' ? false : true,
                bgColor: bgColor as string | undefined,
                borderColor: borderColor as string | undefined,
                textColor: textColor as string | undefined,
                titleColor: titleColor as string | undefined,
            };
            const graphData = { ...contributions, year: displayYear };

            const getSvg = async (): Promise<string> => {
                const cached = GraphController.cache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < GraphController.CACHE_DURATION) return cached.data;
                const svg = GraphRenderer.generateGraphCard(graphData, cardOptions);
                GraphController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });
                return svg;
            };

            if (format === 'webp' || format === 'png' || format === 'gif') {
                const rasterCacheKey = `${cacheKey}|${format}`;
                const cachedRaster = (GraphController as any)._rasterCache?.get(rasterCacheKey);
                if (cachedRaster && Date.now() - cachedRaster.timestamp < GraphController.CACHE_DURATION) {
                    res.setHeader('Content-Type', `image/${format}`);
                    res.setHeader('Cache-Control', 'public, max-age=600');
                    return res.send(cachedRaster.data);
                }

                let buffer: Buffer;

                if (format === 'png') {
                    // Single static frame
                    const svgData = await getSvg();
                    buffer = await sharp(Buffer.from(svgData)).png().toBuffer();
                } else {
                    // Animated GIF or WebP — generate frames via per-frame opacity snapshots
                    const FRAME_COUNT = 20;
                    const FRAME_DELAY_MS = 80; // ~12 fps

                    // Rasterize all frames in parallel
                    const pngFrames = await Promise.all(
                        Array.from({ length: FRAME_COUNT }, (_, i) => {
                            const frameSvg = GraphRenderer.generateGraphCard(graphData, cardOptions, i / FRAME_COUNT);
                            return sharp(Buffer.from(frameSvg)).png().toBuffer();
                        })
                    );

                    // Get canvas dimensions from first frame
                    const { width: fw, height: fh } = await sharp(pngFrames[0]).metadata();

                    // Assemble animated GIF using createReadStream (stream mode is required)
                    const encoder = new GIFEncoder(fw!, fh!);
                    const gifChunks: Buffer[] = [];
                    const gifBuffer = await new Promise<Buffer>((resolve, reject) => {
                        const readStream = encoder.createReadStream();
                        readStream.on('data', (chunk: Buffer) => gifChunks.push(Buffer.from(chunk)));
                        readStream.on('end', () => resolve(Buffer.concat(gifChunks)));
                        readStream.on('error', reject);

                        encoder.start();
                        encoder.setRepeat(0);        // loop forever
                        encoder.setDelay(FRAME_DELAY_MS);
                        encoder.setQuality(10);
                        for (const pngBuf of pngFrames) {
                            const decoded = PNG.sync.read(pngBuf);
                            encoder.addFrame(decoded.data as unknown as CanvasRenderingContext2D);
                        }
                        encoder.finish();
                    });

                    buffer = format === 'webp'
                        // sharp can convert animated GIF → animated WebP natively
                        ? await sharp(gifBuffer, { animated: true }).webp({ loop: 0 }).toBuffer()
                        : gifBuffer;
                }

                if (!(GraphController as any)._rasterCache) (GraphController as any)._rasterCache = new Map();
                (GraphController as any)._rasterCache.set(rasterCacheKey, { data: buffer, timestamp: Date.now() });
                res.setHeader('Content-Type', `image/${format === 'gif' ? 'gif' : format === 'webp' ? 'webp' : 'png'}`);
                res.setHeader('Cache-Control', 'public, max-age=600');
                return res.send(buffer);
            }

            const svg = await getSvg();
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(svg);
        } catch (error) {
            console.error('Error generating graph:', error);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
