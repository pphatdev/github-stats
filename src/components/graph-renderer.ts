import { ContributionGraphData, GraphCardOptions } from '../types.js';
import { getTheme } from '../utils/themes.js';

export class GraphRenderer {
    private static readonly STARFIELD_CACHE = new Map<string, string>();
    private static readonly COLOR_CACHE = new Map<string, string>();

    static readonly DIMENSIONS = { WIDTH: 1200, HEIGHT: 600 };

    private static getStarfield(width: number, height: number, textColor: string): string {
        // Always key by full canvas dims so the cache works across show_background states
        const cacheKey = `${width}-${height}-${textColor}`;
        const cached = this.STARFIELD_CACHE.get(cacheKey);
        if (cached) return cached;

        let seed = 54321;
        const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

        const stars = Array.from({ length: 40 }, () => {
            const x = (rng() * width) | 0;
            const y = (rng() * height) | 0;
            const r = (rng() * 1 + 0.5).toFixed(1);
            const op = (rng() * 0.5 + 0.2).toFixed(1);
            const dur = (rng() * 3 + 2).toFixed(1);
            const del = (rng() * 5).toFixed(1);
            const opDim = (parseFloat(op) * 0.3).toFixed(1);
            return `<circle cx="${x}" cy="${y}" r="${r}" fill="${textColor}" opacity="${op}"><animate attributeName="opacity" values="${op};${opDim};${op}" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/></circle>`;
        }).join('');

        this.STARFIELD_CACHE.set(cacheKey, stars);
        return stars;
    }

    private static adjustColor(hex: string, percent: number): string {
        const key = hex + percent;
        const cached = this.COLOR_CACHE.get(key);
        if (cached) return cached;
        try {
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const clamp = (v: number) => v < 0 ? 0 : v > 255 ? 255 : v;
            const result = '#' + (
                0x1000000 +
                clamp((num >> 16) + amt) * 0x10000 +
                clamp(((num >> 8) & 0xff) + amt) * 0x100 +
                clamp((num & 0xff) + amt)
            ).toString(16).slice(1);
            this.COLOR_CACHE.set(key, result);
            return result;
        } catch {
            return hex;
        }
    }

    static generateGraphCard(data: ContributionGraphData, options: GraphCardOptions): string {
        const theme = getTheme(options.theme, {
            bgColor: options.bgColor,
            borderColor: options.borderColor,
            textColor: options.textColor,
            titleColor: options.titleColor,
        });

        const SIZE_PRESETS: Record<string, { WIDTH: number; HEIGHT: number }> = {
            small:   { WIDTH: 800,  HEIGHT: 400 },
            medium:  { WIDTH: 1000, HEIGHT: 500 },
            default: { WIDTH: 1200, HEIGHT: 600 },
            large:   { WIDTH: 1400, HEIGHT: 700 },
        };
        const { WIDTH: width, HEIGHT: height } = SIZE_PRESETS[options.size ?? 'default'] ?? SIZE_PRESETS.default;
        const scale = width / 1200;
        const titleFontSize = Math.round(42 * scale);
        const contribFontSize = Math.round(18 * scale);
        const fontName = theme.fontName || 'Orbitron';
        const fontFamily = theme.fontFamily || `'${fontName}', 'Ubuntu', 'sans-serif'`;
        const fontUrl = theme.fontUrl || '/fonts/orbitron.woff2';
        const fontFace = fontUrl
            ? `@font-face{font-family:'${fontName}';font-style:normal;font-weight:400 900;font-display:swap;src:url(${fontUrl})format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`
            : '';

        const levelColors = [
            this.adjustColor(theme.bgColor, 15),
            this.adjustColor(theme.iconColor, -50),
            this.adjustColor(theme.iconColor, -25),
            theme.iconColor,
            this.adjustColor(theme.iconColor, 25),
        ];

        const cellSize = Math.round(14 * scale);
        const gap = Math.max(2, Math.round(4 * scale));
        const step = cellSize + gap;
        const gridWidth = data.weeks.length * step;
        const gridHeight = 7 * step;

        const showTitle = options.show_title !== false;
        const showContrib = options.show_total_contribution !== false;
        const showBackground = options.show_background !== false;

        const bgMargin = 10;
        const svgWidth = showBackground ? width : gridWidth + bgMargin * 2;
        const startX = showBackground ? (width - gridWidth) / 2 : bgMargin;

        const titleY = Math.round(90 * scale);
        const titleFrameY1 = Math.round(52 * scale);
        const titleFrameY2 = Math.round(100 * scale);

        const svgRenderHeight = showContrib
            ? height
            : showTitle
                ? Math.max(Math.round(300 * scale), Math.round(158 * scale) + gridHeight + Math.round(90 * scale))
                : Math.max(Math.round(240 * scale), Math.round(48 * scale) + gridHeight + Math.round(90 * scale));

        const startY = (showTitle && showContrib)
            ? Math.round((height - gridHeight) / 2 + Math.round(60 * scale))
            : (!showTitle && showContrib)
                ? Math.round((height - gridHeight) / 2)
                : showTitle
                    ? Math.round(svgRenderHeight * 0.15) + titleFrameY2 + Math.round(28 * scale)
                    : Math.round(svgRenderHeight * 0.15) + Math.round(28 * scale);

        const contribBaseY = showTitle ? Math.round(125 * scale) : Math.round(startY / 2);
        const contribFrameTop = contribBaseY - Math.round(28 * scale);
        const contribFrameBot = contribBaseY + Math.round(14 * scale);

        // Stars only needed when background is visible; cache uses full canvas dims
        const stars = showBackground ? this.getStarfield(width, height, theme.textColor) : '';

        // ── Cells ──────────────────────────────────────────────────────────────
        const animateMode = options.animate;
        const cells = data.weeks.map((week, x) => {
            const xPos = (startX + x * step).toFixed(1);
            const xDelay = (x * 0.04).toFixed(2);
            return week.map((day, y) => {
                const color = levelColors[day.level] || levelColors[0];
                const yPos = (startY + y * step).toFixed(1);

                if (day.level === 0 || animateMode === 'none') {
                    return `<rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" opacity="${day.level === 0 ? 0.3 : 0.85}"/>`;
                }

                let animation = '';
                let isAnimating = true;

                if (animateMode === 'wave') {
                    const d = (x * 0.05 + y * 0.02).toFixed(2);
                    animation = `<animate attributeName="opacity" values="0.1;0.8;0.1" dur="3s" begin="${d}s" repeatCount="indefinite"/>`;
                } else if (animateMode === 'pulse') {
                    const seed = (x * 7 + y) * 1337 % 1000;
                    isAnimating = seed % 22 === 0;
                    if (isAnimating) {
                        animation = `<animate attributeName="opacity" values="0.1;1;0.1" dur="${(1.5 + (seed % 10) * 0.1).toFixed(1)}s" begin="${(seed % 20 * 0.1).toFixed(1)}s" repeatCount="indefinite"/>`;
                    }
                } else {
                    const dur = (2.0 + (x % 4) * 0.5).toFixed(1);
                    animation = `<animate attributeName="opacity" values="0.2;0.7;0.2" dur="${dur}s" begin="${xDelay}s" repeatCount="indefinite"/>`;
                }

                if (!isAnimating) {
                    return `<rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" opacity="0.85"/>`;
                }

                return `<g><rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" opacity="0.4" filter="url(#glowSmall)">${animation}</rect><rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" opacity="0.85"/></g>`;
            }).join('');
        }).join('');

        // ── Month labels ───────────────────────────────────────────────────────
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthY = (startY - 10).toFixed(1);
        const monthParts: string[] = [];
        let currentMonth = -1;
        for (let i = 0; i < data.weeks.length; i++) {
            const day0 = data.weeks[i][0];
            if (!day0) continue;
            const month = new Date(day0.date).getMonth();
            if (month !== currentMonth) {
                currentMonth = month;
                monthParts.push(`<text x="${(startX + i * step).toFixed(1)}" y="${monthY}" fill="${theme.textColor}" font-size="${Math.round(10 * scale)}" opacity="0.5" font-family="${fontFamily}">${MONTHS[month]}</text>`);
            }
        }

        // ── Pre-computed sections ──────────────────────────────────────────────
        const buildCornerPaths = (x1: number, y1: number, x2: number, y2: number, arm: number) => {
            const xa1 = (x1 + arm).toFixed(1); const xa2 = (x2 - arm).toFixed(1);
            const ya1 = (y1 + arm).toFixed(1); const ya2 = (y2 - arm).toFixed(1);
            const sx1 = x1.toFixed(1); const sy1 = y1.toFixed(1);
            const sx2 = x2.toFixed(1); const sy2 = y2.toFixed(1);
            return `<path d="M ${xa1} ${sy1} L ${sx1} ${sy1} L ${sx1} ${ya1}"/><path d="M ${xa2} ${sy1} L ${sx2} ${sy1} L ${sx2} ${ya1}"/><path d="M ${xa1} ${sy2} L ${sx1} ${sy2} L ${sx1} ${ya2}"/><path d="M ${xa2} ${sy2} L ${sx2} ${sy2} L ${sx2} ${ya2}"/>`;
        };

        const titleSection = (() => {
            if (!showTitle) return '';
            const cx = svgWidth / 2;
            const titleText = data.username + "'s Activity " + data.year;
            const tfw = (titleText.length * Math.round(24 * scale)) / 2;
            return [
                `<text x="50%" y="${titleY}" text-anchor="middle" fill="${theme.titleColor}" font-size="${titleFontSize}" font-family="${fontFamily}" font-weight="700" style="filter:drop-shadow(0 0 12px ${theme.titleColor}66)">${titleText}</text>`,
                `<g fill="none" stroke="${theme.titleColor}" stroke-width="1.5" opacity="0.25">${buildCornerPaths(cx - tfw - Math.round(12 * scale), titleFrameY1, cx + tfw + Math.round(12 * scale), titleFrameY2, Math.round(16 * scale))}</g>`,
            ].join('\n            ');
        })();

        const contribSection = (() => {
            if (!showContrib) return '';
            const cx = svgWidth / 2;
            const contribText = data.totalContributions.toLocaleString() + ' total contributions';
            const tfw = (contribText.length * Math.round(11 * scale)) / 2;
            return [
                `<text x="50%" y="${contribBaseY}" text-anchor="middle" fill="${theme.textColor}" font-size="${contribFontSize}" opacity="0.8" font-family="${fontFamily}" filter="url(#textGlow)">${contribText}</text>`,
                `<g fill="none" stroke="${theme.iconColor}" stroke-width="1.5" opacity="0.35">${buildCornerPaths(cx - tfw - Math.round(9 * scale), contribFrameTop, cx + tfw + Math.round(9 * scale), contribFrameBot, Math.round(12 * scale))}</g>`,
            ].join('\n            ');
        })();

        const gridCorners = `<g fill="none" stroke="${theme.iconColor}" stroke-width="1.5" opacity="0.35">${buildCornerPaths(startX - Math.round(24 * scale), startY - Math.round(28 * scale), startX + gridWidth + Math.round(24 * scale), startY + gridHeight + Math.round(24 * scale), Math.round(12 * scale))}</g>`;

        const gridLines = showBackground ? (() => {
            const vLines = Array.from({ length: 24 }, (_, i) => {
                const x = ((i + 1) * svgWidth / 24) | 0;
                return `<line x1="${x}" y1="0" x2="${x}" y2="${svgRenderHeight}" stroke="${theme.iconColor}" stroke-width="0.5"/>`;
            }).join('');
            const hLines = Array.from({ length: 12 }, (_, i) => {
                const y = ((i + 1) * svgRenderHeight / 12) | 0;
                return `<line x1="0" y1="${y}" x2="${svgWidth}" y2="${y}" stroke="${theme.iconColor}" stroke-width="0.5"/>`;
            }).join('');
            return `<g opacity="0.12">${vLines}${hLines}</g>`;
        })() : '';

        const legend = (() => {
            const lgCell = Math.round(12 * scale);
            const lgStep = Math.round(15 * scale);
            const lgFont = Math.round(10 * scale);
            const lgTextY = Math.round(10 * scale);
            const lx = (startX + gridWidth - Math.round(100 * scale)).toFixed(1);
            const ly = (startY + gridHeight + Math.round(25 * scale)).toFixed(1);
            const rects = levelColors.map((c, i) => `<rect x="${i * lgStep}" y="0" width="${lgCell}" height="${lgCell}" fill="${c}" rx="2" opacity="${i === 0 ? 0.3 : 0.9}"/>`).join('');
            return `<g transform="translate(${lx},${ly})"><text x="${-Math.round(35 * scale)}" y="${lgTextY}" fill="${theme.textColor}" font-size="${lgFont}" opacity="0.5" font-family="${fontFamily}">Less</text>${rects}<text x="${levelColors.length * lgStep + Math.round(5 * scale)}" y="${lgTextY}" fill="${theme.textColor}" font-size="${lgFont}" opacity="0.5" font-family="${fontFamily}">More</text></g>`;
        })();

        const divClipX = (svgWidth / 2 - (width - 160) / 4).toFixed(1);
        const divClipW = ((width - 160) / 2).toFixed(1);

        return `<svg width="${svgWidth}" height="${svgRenderHeight}" viewBox="0 0 ${svgWidth} ${svgRenderHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="spaceGradient" cx="50%" cy="50%">
                    <stop offset="0%" style="stop-color:${theme.bgColor};stop-opacity:1"/>
                    <stop offset="60%" style="stop-color:#02030a;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:1"/>
                </radialGradient>
                <filter id="glowSmall" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                    <feComponentTransfer in="blur" result="brightBlur"><feFuncA type="linear" slope="1.5"/></feComponentTransfer>
                    <feMerge><feMergeNode in="brightBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="dividerGlow" x="-10%" y="-150%" width="120%" height="400%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <linearGradient id="glowSpot" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="${theme.titleColor}" stop-opacity="0"/>
                    <stop offset="50%" stop-color="${theme.titleColor}" stop-opacity="1"/>
                    <stop offset="100%" stop-color="${theme.titleColor}" stop-opacity="0"/>
                </linearGradient>
                <clipPath id="dividerClip"><rect x="${divClipX}" y="108" width="${divClipW}" height="8"/></clipPath>
                <linearGradient id="dividerFade" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="${theme.iconColor}" stop-opacity="0"/>
                    <stop offset="15%" stop-color="${theme.iconColor}" stop-opacity="0.2"/>
                    <stop offset="85%" stop-color="${theme.iconColor}" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="${theme.iconColor}" stop-opacity="0"/>
                </linearGradient>
                <filter id="textGlow" x="-20%" y="-60%" width="140%" height="220%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur">
                        <animate attributeName="stdDeviation" values="0.5;2.5;0.8;3;0.5;1.5;2;0.5" dur="9s" repeatCount="indefinite"/>
                    </feGaussianBlur>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <style>${fontFace} text{font-family:${fontFamily}}</style>
            <rect width="100%" height="100%" fill="${showBackground ? 'url(#spaceGradient)' : 'none'}"/>
            ${stars}
            ${gridLines}
            ${titleSection}
            ${contribSection}
            <g>${cells}${monthParts.join('')}</g>
            ${legend}
            ${gridCorners}
        </svg>`;
    }
}