import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { GraphRenderer } from '../components/graph-renderer.js';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { spawn } from 'child_process';
import { mkdir, writeFile, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const ffmpegPath = _require('ffmpeg-static') as string;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', '..', 'public');

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
            'format',
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
        const startTime = Date.now();
        const timings: { [key: string]: number } = {};

        try {
            const { username, theme = 'default', year, animate, size, as: outputFormat, format: formatParam, show_title = 'false', show_total_contribution = 'false', show_background = 'false', bgColor, borderColor, textColor, titleColor } = req.query;

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

            const format = typeof outputFormat === 'string' ? outputFormat.toLowerCase() : typeof formatParam === 'string' ? formatParam.toLowerCase() : 'svg';
            const cacheKey = `graph-${username}-${theme}-${cacheKeyExtra}-${animate || ''}-${size || ''}-${show_title ?? ''}-${show_total_contribution ?? ''}-${show_background ?? ''}-${bgColor || ''}-${borderColor || ''}-${textColor || ''}-${titleColor || ''}`;

            const apiStartTime = Date.now();
            const contributions = await GraphController.githubClient.fetchUserContributions(username, from, to, cacheKeyExtra);
            timings['github_api'] = Date.now() - apiStartTime;

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
                const renderStartTime = Date.now();
                const svg = GraphRenderer.generateGraphCard(graphData, cardOptions);
                timings['svg_render'] = Date.now() - renderStartTime;
                GraphController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });
                return svg;
            };

            if (format === 'webp' || format === 'png') {
                const rasterCacheKey = `${cacheKey}|${format}`;
                const cachedRaster = (GraphController as any)._rasterCache?.get(rasterCacheKey);
                if (cachedRaster && Date.now() - cachedRaster.timestamp < GraphController.CACHE_DURATION) {
                    timings['total'] = Date.now() - startTime;
                    res.setHeader('X-Timing', JSON.stringify(timings));
                    res.setHeader('Content-Type', `image/${format}`);
                    res.setHeader('Cache-Control', 'public, max-age=600');
                    return res.send(cachedRaster.data);
                }

                let buffer: Buffer;

                if (format === 'png') {
                    // Single static frame using resvg-js for fast, high-quality SVG→PNG
                    const svgData = await getSvg();
                    const convertStartTime = Date.now();

                    // Use resvg-js: optimized for SVG→PNG, much faster than sharp
                    const resvg = new Resvg(svgData, {
                        font: {
                            loadSystemFonts: false, // Faster - don't scan system fonts
                            fontDirs: [],
                        },
                        logLevel: 'error',
                    });

                    const pngData = resvg.render();
                    buffer = pngData.asPng();
                    timings['png_convert'] = Date.now() - convertStartTime;
                } else {
                    // Animated WebP — generate frames and encode with FFmpeg
                    const FRAME_COUNT = 20;
                    const FRAME_DELAY_MS = 80; // ~12 fps

                    if (!ffmpegPath) throw new Error('ffmpeg binary not found');

                    const tmpDir = join(publicDir, 'user', username);
                    await mkdir(tmpDir, { recursive: true });

                    const outFile = join(tmpDir, 'output.webp');

                    // Re-use the previously rendered file if it's still within cache window
                    const reuse = await stat(outFile)
                        .then(s => Date.now() - s.mtimeMs < GraphController.CACHE_DURATION)
                        .catch(() => false);

                    if (!reuse) {
                        // Rasterize all frames in parallel
                        const pngFrames = await Promise.all(
                            Array.from({ length: FRAME_COUNT }, (_, i) => {
                                const frameSvg = GraphRenderer.generateGraphCard(graphData, cardOptions, i / FRAME_COUNT);
                                return sharp(Buffer.from(frameSvg)).png().toBuffer();
                            })
                        );

                        // Write frames with zero-padded names (no %-pattern issues on Windows)
                        await Promise.all(
                            pngFrames.map((buf, i) =>
                                writeFile(join(tmpDir, `frame${String(i).padStart(3, '0')}.png`), buf)
                            )
                        );

                        // Build an explicit concat file to avoid shell-expanding % on Windows
                        const concatLines = pngFrames
                            .map((_, i) => `file '${join(tmpDir, `frame${String(i).padStart(3, '0')}.png`).replace(/\\/g, '/')}'\nduration ${FRAME_DELAY_MS / 1000}`)
                            .join('\n');
                        const concatFile = join(tmpDir, 'concat.txt');
                        await writeFile(concatFile, concatLines + '\n');

                        await new Promise<void>((resolve, reject) => {
                            const stderr: Buffer[] = [];
                            const proc = spawn(ffmpegPath, [
                                '-y',
                                '-f', 'concat',
                                '-safe', '0',
                                '-i', concatFile.replace(/\\/g, '/'),
                                '-c:v', 'libwebp_anim',
                                '-lossless', '0',
                                '-q:v', '75',
                                '-compression_level', '4',
                                '-loop', '0',
                                '-an',
                                outFile.replace(/\\/g, '/'),
                            ]);
                            proc.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
                            proc.on('close', (code: number) =>
                                code === 0
                                    ? resolve()
                                    : reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(stderr).toString().slice(-400)}`))
                            );
                        });
                    }

                    buffer = await readFile(outFile);
                }

                if (!(GraphController as any)._rasterCache) (GraphController as any)._rasterCache = new Map();
                (GraphController as any)._rasterCache.set(rasterCacheKey, { data: buffer, timestamp: Date.now() });
                timings['total'] = Date.now() - startTime;
                res.setHeader('X-Timing', JSON.stringify(timings));
                res.setHeader('Content-Type', `image/${format === 'webp' ? 'webp' : 'png'}`);
                res.setHeader('Cache-Control', 'public, max-age=600');
                return res.send(buffer);
            }

            const svg = await getSvg();
            timings['total'] = Date.now() - startTime;
            res.setHeader('X-Timing', JSON.stringify(timings));
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(svg);
        } catch (error) {
            timings['total'] = Date.now() - startTime;
            console.error('Error generating graph:', error);
            console.error('Timings:', timings);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
