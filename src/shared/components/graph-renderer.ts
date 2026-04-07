import { ContributionGraphData, GraphCardOptions } from '../../types.js';
import { getTheme } from '../utils/themes.js';

export class GraphRenderer {
    private static readonly STARFIELD_CACHE = new Map<string, string>();
    private static readonly COLOR_CACHE = new Map<string, string>();

    static readonly DIMENSIONS = { WIDTH: 1200, HEIGHT: 600 };

    // Allocated once — not re-created per generateGraphCard call
    private static readonly SIZE_PRESETS: Record<string, { WIDTH: number; HEIGHT: number }> = {
        small: { WIDTH: 800, HEIGHT: 400 },
        medium: { WIDTH: 1000, HEIGHT: 500 },
        default: { WIDTH: 1200, HEIGHT: 600 },
        large: { WIDTH: 1400, HEIGHT: 700 },
    };
    private static readonly MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

    // Reusable lerp value arrays — avoids allocating [0.1,0.8,0.1] on every animated cell
    private static readonly LERP_WAVE = [0.1, 0.8, 0.1] as const;
    private static readonly LERP_PULSE = [0.1, 1.0, 0.1] as const;
    private static readonly LERP_GLOW = [0.2, 0.7, 0.2] as const;

    private static getStarfield(width: number, height: number, textColor: string): string {
        // Always key by full canvas dims so the cache works across show_background states
        const cacheKey = `${width}-${height}-${textColor}`;
        const cached = this.STARFIELD_CACHE.get(cacheKey);
        if (cached) return cached;

        let seed = 54321;
        const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

        const parts: string[] = [];
        for (let i = 0; i < 40; i++) {
            const x = (rng() * width) | 0;
            const y = (rng() * height) | 0;
            const r = (rng() * 1 + 0.5).toFixed(1);
            const op = (rng() * 0.5 + 0.2).toFixed(1);
            const dur = (rng() * 3 + 2).toFixed(1);
            const del = (rng() * 5).toFixed(1);
            const opDim = (parseFloat(op) * 0.3).toFixed(1);
            parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${textColor}" opacity="${op}"><animate attributeName="opacity" values="${op};${opDim};${op}" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/></circle>`);
        }

        const stars = parts.join('');
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

    /**
     * @param frameTime optional 0..1 normalized position in the animation cycle.
     * When set, all SVG <animate> elements are replaced with statically computed
     * opacity values so sharp/librsvg renders a meaningful raster frame.
     */
    static generateGraphCard(data: ContributionGraphData, options: GraphCardOptions, frameTime?: number): string {
        const theme = getTheme(options.theme, {
            bgColor: options.bgColor,
            borderColor: options.borderColor,
            textColor: options.textColor,
            titleColor: options.titleColor,
        });

        const { WIDTH: width, HEIGHT: height } =
            GraphRenderer.SIZE_PRESETS[options.size ?? 'default'] ?? GraphRenderer.SIZE_PRESETS.default;

        const scale = width / 1200;

        // ── Pre-compute all scale-dependent constants (avoids repeated Math.round in loops) ──
        const s = (n: number) => Math.round(n * scale);
        const sc5 = s(5);
        const sc9 = s(9);
        const sc10 = s(10);
        const sc11 = s(11);
        const sc12 = s(12);
        const sc14 = s(14);
        const sc15 = s(15);
        const sc16 = s(16);
        const sc24 = s(24);
        const sc25 = s(25);
        const sc28 = s(28);
        const sc35 = s(35);
        const sc42 = s(42);
        const sc48 = s(48);
        const sc60 = s(60);
        const sc90 = s(90);
        const sc100 = s(100);
        const sc125 = s(125);
        const sc158 = s(158);
        const sc240 = s(240);
        const sc300 = s(300);

        const titleFontSize = sc42;
        const contribFontSize = s(18);

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

        const cellSize = sc14;
        const gap = Math.max(2, s(4));
        const step = cellSize + gap;
        const weeksLen = data.weeks.length;
        const gridWidth = weeksLen * step;
        const gridHeight = 7 * step;

        const showTitle = options.show_title !== false;
        const showContrib = options.show_total_contribution !== false;
        const showBackground = options.show_background !== false;

        const bgMargin = 10;
        const svgWidth = showBackground ? width : gridWidth + bgMargin * 2;
        const startX = showBackground ? (width - gridWidth) / 2 : bgMargin;

        const titleY = sc90;
        const titleFrameY1 = s(52);
        const titleFrameY2 = s(100);

        const svgRenderHeight = showContrib
            ? height
            : showTitle
                ? Math.max(sc300, sc158 + gridHeight + sc90)
                : Math.max(sc240, sc48 + gridHeight + sc90);

        const startY = (showTitle && showContrib)
            ? Math.round((height - gridHeight) / 2 + sc60)
            : (!showTitle && showContrib)
                ? Math.round((height - gridHeight) / 2)
                : showTitle
                    ? Math.round(svgRenderHeight * 0.15) + titleFrameY2 + sc28
                    : Math.round(svgRenderHeight * 0.15) + sc28;

        const contribBaseY = showTitle ? sc125 : Math.round(startY / 2);
        const contribFrameTop = contribBaseY - sc28;
        const contribFrameBot = contribBaseY + s(14);

        // Stars only needed when background is visible; cache uses full canvas dims
        const stars = showBackground ? this.getStarfield(width, height, theme.textColor) : '';

        // ── Pre-compute position format strings (avoid repeated toFixed in cell loop) ────────
        const xPosFmt: string[] = new Array(weeksLen);
        const xDelayFmt: string[] = new Array(weeksLen);
        const xDelayNum: number[] = new Array(weeksLen);
        for (let i = 0; i < weeksLen; i++) {
            xPosFmt[i] = (startX + i * step).toFixed(1);
            xDelayNum[i] = i * 0.04;
            xDelayFmt[i] = xDelayNum[i].toFixed(2);
        }
        const yPosFmt: string[] = new Array(7);
        for (let j = 0; j < 7; j++) {
            yPosFmt[j] = (startY + j * step).toFixed(1);
        }

        // ── Cells ──────────────────────────────────────────────────────────────
        const animateMode = options.animate;
        const ANIM_CYCLE = 8; // seconds — covers all animation durations
        const isFrameExport = frameTime !== undefined;

        // Pre-compute per-column glow CSS animation strings — identical for every row in a column
        const glowAnimPerCol: string[] =
            (animateMode !== 'wave' && animateMode !== 'pulse')
                ? Array.from({ length: weeksLen }, (_, x) => {
                    const dur = (2.0 + (x % 4) * 0.5).toFixed(1);
                    return `style="animation:graph-glow ${dur}s ${xDelayFmt[x]}s infinite"`;
                })
                : [];

        // Bind static lerp arrays to local vars to avoid prototype lookups in hot loop
        const LERP_WAVE = GraphRenderer.LERP_WAVE;
        const LERP_PULSE = GraphRenderer.LERP_PULSE;
        const LERP_GLOW = GraphRenderer.LERP_GLOW;

        const lerpAnim = (vals: readonly number[], dur: number, begin: number): number => {
            const t = ((frameTime! * ANIM_CYCLE - begin) / dur % 1 + 1) % 1;
            const pos = t * (vals.length - 1);
            const i = Math.floor(pos);
            return vals[i] * (1 - (pos - i)) + vals[Math.min(i + 1, vals.length - 1)] * (pos - i);
        };

        // Flat push array — avoids allocating O(weeks × 7) intermediate string arrays
        const cellParts: string[] = [];

        for (let x = 0; x < weeksLen; x++) {
            const week = data.weeks[x];
            const xPos = xPosFmt[x];
            const glowAnim = glowAnimPerCol[x] ?? '';

            for (let y = 0; y < week.length; y++) {
                const day = week[y];
                const level = day.level;
                const color = levelColors[level] ?? levelColors[0];
                const yPos = yPosFmt[y];
                // Shared rect prefix (no closing > so we can append attributes)
                const pfx = `<rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2"`;

                if (level === 0 || animateMode === 'none') {
                    cellParts.push(`${pfx} opacity="${level === 0 ? 0.3 : 0.85}"/>`);
                    continue;
                }

                // ── Static frame snapshot (for raster export) ──────────────────
                if (isFrameExport) {
                    let op: number;
                    if (animateMode === 'wave') {
                        op = lerpAnim(LERP_WAVE, 3, x * 0.05 + y * 0.02);
                    } else if (animateMode === 'pulse') {
                        const seed = (x * 7 + y) * 1337 % 1000;
                        op = seed % 22 === 0
                            ? lerpAnim(LERP_PULSE, 1.5 + (seed % 10) * 0.1, seed % 20 * 0.1)
                            : 0.85;
                    } else {
                        // glow (default)
                        op = lerpAnim(LERP_GLOW, 2.0 + (x % 4) * 0.5, xDelayNum[x]);
                    }
                    cellParts.push(`${pfx} opacity="${op.toFixed(2)}"/>`);
                    continue;
                }

                // ── Live SVG animation ─────────────────────────────────────────
                if (animateMode === 'wave') {
                    const d = (x * 0.05 + y * 0.02).toFixed(2);
                    cellParts.push(`<g>${pfx} opacity="0.4" filter="url(#glowSmall)" style="animation:graph-wave 3s ${d}s infinite"/>${pfx} opacity="0.85"/></g>`);
                } else if (animateMode === 'pulse') {
                    const seed = (x * 7 + y) * 1337 % 1000;
                    if (seed % 22 !== 0) {
                        cellParts.push(`${pfx} opacity="0.85"/>`);
                    } else {
                        cellParts.push(`<g>${pfx} opacity="0.4" filter="url(#glowSmall)" style="animation:graph-pulse ${(1.5 + (seed % 10) * 0.1).toFixed(1)}s ${(seed % 20 * 0.1).toFixed(1)}s infinite"/>${pfx} opacity="0.85"/></g>`);
                    }
                } else {
                    // glow (default) — CSS animation style is pre-computed per column
                    cellParts.push(`<g>${pfx} opacity="0.4" filter="url(#glowSmall)" ${glowAnim}/>${pfx} opacity="0.85"/></g>`);
                }
            }
        }

        const cells = cellParts.join('');

        // ── Month labels ───────────────────────────────────────────────────────
        const MONTHS = GraphRenderer.MONTHS;
        const monthY = (startY - 10).toFixed(1);
        const monthParts: string[] = [];
        let currentMonth = -1;
        for (let i = 0; i < weeksLen; i++) {
            const day0 = data.weeks[i][0];
            if (!day0) continue;
            // Fast parse: "YYYY-MM-DD" slice avoids constructing a Date object
            const month = parseInt(day0.date.slice(5, 7), 10) - 1;
            if (month !== currentMonth) {
                currentMonth = month;
                monthParts.push(`<text x="${xPosFmt[i]}" y="${monthY}" fill="${theme.textColor}" font-size="${sc10}" opacity="0.5" font-family="${fontFamily}">${MONTHS[month]}</text>`);
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

        const cx = svgWidth / 2;

        const titleSection = (() => {
            if (!showTitle) return '';
            const titleText = data.username + "'s Activity " + data.year;
            const tfw = (titleText.length * sc24) / 2;
            return `<text x="50%" y="${titleY}" text-anchor="middle" fill="${theme.titleColor}" font-size="${titleFontSize}" font-family="${fontFamily}" font-weight="700" style="filter:drop-shadow(0 0 12px ${theme.titleColor}66)">${titleText}</text>\n            <g fill="none" stroke="${theme.titleColor}" stroke-width="1.5" opacity="0.25">${buildCornerPaths(cx - tfw - sc12, titleFrameY1, cx + tfw + sc12, titleFrameY2, sc16)}</g>`;
        })();

        const contribSection = (() => {
            if (!showContrib) return '';
            const contribText = data.totalContributions.toLocaleString() + ' total contributions';
            const tfw = (contribText.length * sc11) / 2;
            return `<text x="50%" y="${contribBaseY}" text-anchor="middle" fill="${theme.textColor}" font-size="${contribFontSize}" opacity="0.8" font-family="${fontFamily}" filter="url(#textGlow)">${contribText}</text>\n            <g fill="none" stroke="${theme.iconColor}" stroke-width="1.5" opacity="0.35">${buildCornerPaths(cx - tfw - sc9, contribFrameTop, cx + tfw + sc9, contribFrameBot, sc12)}</g>`;
        })();

        const gridCorners = `<g fill="none" stroke="${theme.iconColor}" stroke-width="1.5" opacity="0.35">${buildCornerPaths(startX - sc24, startY - sc28, startX + gridWidth + sc24, startY + gridHeight + sc24, sc12)}</g>`;

        const gridLines = showBackground ? (() => {
            // Plain for-loops avoid Array.from allocation overhead
            const lineParts: string[] = [];
            const ic = theme.iconColor;
            const vStep = svgWidth / 24;
            const hStep = svgRenderHeight / 12;
            for (let i = 1; i <= 24; i++) {
                const lx = (i * vStep) | 0;
                lineParts.push(`<line x1="${lx}" y1="0" x2="${lx}" y2="${svgRenderHeight}" stroke="${ic}" stroke-width="0.5"/>`);
            }
            for (let i = 1; i <= 12; i++) {
                const ly = (i * hStep) | 0;
                lineParts.push(`<line x1="0" y1="${ly}" x2="${svgWidth}" y2="${ly}" stroke="${ic}" stroke-width="0.5"/>`);
            }
            return `<g opacity="0.12">${lineParts.join('')}</g>`;
        })() : '';

        const legend = (() => {
            const lgCell = sc12;
            const lgStep = sc15;
            const lgFont = sc10;
            const lgTextY = sc10;
            const lx = (startX + gridWidth - sc100).toFixed(1);
            const ly = (startY + gridHeight + sc25).toFixed(1);
            const rects = levelColors.map((c, i) => `<rect x="${i * lgStep}" y="0" width="${lgCell}" height="${lgCell}" fill="${c}" rx="2" opacity="${i === 0 ? 0.3 : 0.9}"/>`).join('');
            return `<g transform="translate(${lx},${ly})"><text x="${-sc35}" y="${lgTextY}" fill="${theme.textColor}" font-size="${lgFont}" opacity="0.5" font-family="${fontFamily}">Less</text>${rects}<text x="${levelColors.length * lgStep + sc5}" y="${lgTextY}" fill="${theme.textColor}" font-size="${lgFont}" opacity="0.5" font-family="${fontFamily}">More</text></g>`;
        })();

        const divClipX = (cx - (width - 160) / 4).toFixed(1);
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
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <style>${fontFace} text{font-family:${fontFamily}} @keyframes graph-wave{0%,100%{opacity:.1}50%{opacity:.8}} @keyframes graph-glow{0%,100%{opacity:.2}50%{opacity:.7}} @keyframes graph-pulse{0%,100%{opacity:.1}50%{opacity:1}}</style>
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