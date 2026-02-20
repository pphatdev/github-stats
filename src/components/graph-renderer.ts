import { ContributionGraphData, GraphCardOptions } from '../types.js';
import { getTheme } from '../utils/themes.js';

export class GraphRenderer {
    // Cache static starfield to avoid regenerating
    private static readonly STARFIELD_CACHE = new Map<string, string>();

    static readonly DIMENSIONS = { WIDTH: 1200, HEIGHT: 600 };

    // Generate deterministic starfield based on theme (cached)
    private static getStarfield(width: number, height: number, textColor: string): string {
        const cacheKey = `${width}-${height}-${textColor}`;
        if (this.STARFIELD_CACHE.has(cacheKey)) {
            return this.STARFIELD_CACHE.get(cacheKey)!;
        }

        let seed = 54321;
        const seededRandom = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        const stars = Array.from({ length: 40 }, () => {
            const x = Math.floor(seededRandom() * width);
            const y = Math.floor(seededRandom() * height);
            const r = (seededRandom() * 1 + 0.5).toFixed(1);
            const opacity = (seededRandom() * 0.5 + 0.2).toFixed(1);
            const duration = (seededRandom() * 3 + 2).toFixed(1);
            const delay = (seededRandom() * 5).toFixed(1);
            return `<circle cx="${x}" cy="${y}" r="${r}" fill="${textColor}" opacity="${opacity}">
                <animate attributeName="opacity" values="${opacity};${(parseFloat(opacity) * 0.3).toFixed(1)};${opacity}" dur="${duration}s" begin="${delay}s" repeatCount="indefinite" />
            </circle>`;
        }).join('');

        this.STARFIELD_CACHE.set(cacheKey, stars);
        return stars;
    }

    private static adjustColor(hex: string, percent: number): string {
        // Simple hex adjust
        try {
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            const final = (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
            return `#${final}`;
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

        const width = this.DIMENSIONS.WIDTH;
        const height = this.DIMENSIONS.HEIGHT;
        const fontName = theme.fontName || 'Orbitron';
        const fontFamily = theme.fontFamily || `'${fontName}', 'Ubuntu', 'sans-serif'`;
        const fontUrl = theme.fontUrl || '/fonts/orbitron.woff2';
        const fontFace = fontUrl
            ? `@font-face{font-family:'${fontName}';font-style:normal;font-weight:400 900;font-display:swap;src:url(${fontUrl})format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`
            : '';

        const levelColors = [
            this.adjustColor(theme.bgColor, 15), // Level 0
            this.adjustColor(theme.iconColor, -50), // Level 1
            this.adjustColor(theme.iconColor, -25), // Level 2
            theme.iconColor, // Level 3
            this.adjustColor(theme.iconColor, 25), // Level 4
        ];

        const cellSize = 14;
        const gap = 4;
        const gridWidth = data.weeks.length * (cellSize + gap);
        const gridHeight = 7 * (cellSize + gap);

        const startX = (width - gridWidth) / 2;
        const startY = (height - gridHeight) / 2 + 60;

        const stars = this.getStarfield(width, height, theme.textColor);

        const cells = data.weeks.map((week, x) => {
            return week.map((day, y) => {
                const color = levelColors[day.level] || levelColors[0];
                const opacity = day.level === 0 ? 0.3 : 0.85;
                const xPos = (startX + x * (cellSize + gap)).toFixed(1);
                const yPos = (startY + y * (cellSize + gap)).toFixed(1);

                if (day.level === 0 || options.animate === 'none') {
                    return `<rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" opacity="${opacity}" />`;
                }

                let isAnimating = true;
                let animation = '';
                const duration = (2.0 + (x % 4) * 0.5).toFixed(1);
                const waveDelay = (x * 0.05 + y * 0.02).toFixed(2);
                const pulseDelay = ((x + y) * 0.04).toFixed(2);

                if (options.animate === 'wave') {
                    animation = `<animate attributeName="opacity" values="0.1;0.8;0.1" dur="3s" begin="${waveDelay}s" repeatCount="indefinite" />`;
                } else if (options.animate === 'pulse') {
                    // Selection logic for 10-20 random cells across random columns
                    const cellId = x * 7 + y;
                    const seed = (cellId * 1337) % 1000;
                    isAnimating = (seed % 22 === 0); // ~4.5% chance -> approx 16 cells for a full year

                    if (isAnimating) {
                        const randomDur = (1.5 + (seed % 10) * 0.1).toFixed(1);
                        const randomDelay = (seed % 20 * 0.1).toFixed(1);
                        animation = `<animate attributeName="opacity" values="0.1;1;0.1" dur="${randomDur}s" begin="${randomDelay}s" repeatCount="indefinite" />`;
                    }
                } else {
                    // Default glow
                    animation = `<animate attributeName="opacity" values="0.2;0.7;0.2" dur="${duration}s" begin="${(x * 0.04).toFixed(2)}s" repeatCount="indefinite" />`;
                }

                if (!isAnimating) {
                    return `<rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" opacity="${opacity}" />`;
                }

                return `
                <g>
                    <rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" opacity="0.4" filter="url(#glowSmall)">
                        ${animation}
                    </rect>
                    <rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="2" opacity="${opacity}" />
                </g>`;
            }).join('');
        }).join('');

        // Month labels
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthElements: string[] = [];
        let currentMonth = -1;

        data.weeks.forEach((week, i) => {
            if (week[0]) {
                const date = new Date(week[0].date);
                const month = date.getMonth();
                if (month !== currentMonth) {
                    currentMonth = month;
                    const x = startX + i * (cellSize + gap);
                    monthElements.push(`<text x="${x.toFixed(1)}" y="${(startY - 10).toFixed(1)}" fill="${theme.textColor}" font-size="10" opacity="0.5" font-family="${fontFamily}">${months[month]}</text>`);
                }
            }
        });

        return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="spaceGradient" cx="50%" cy="50%">
                    <stop offset="0%" style="stop-color:${theme.bgColor};stop-opacity:1" />
                    <stop offset="60%" style="stop-color:#02030a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
                </radialGradient>
                <filter id="glowSmall" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                    <feComponentTransfer in="blur" result="brightBlur">
                        <feFuncA type="linear" slope="1.5"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="brightBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <filter id="dividerGlow" x="-10%" y="-150%" width="120%" height="400%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <linearGradient id="glowSpot" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="${theme.titleColor}" stop-opacity="0"/>
                    <stop offset="50%" stop-color="${theme.titleColor}" stop-opacity="1"/>
                    <stop offset="100%" stop-color="${theme.titleColor}" stop-opacity="0"/>
                </linearGradient>
                <clipPath id="dividerClip">
                    <rect x="${width / 2 - (width - 160) / 4}" y="108" width="${(width - 160) / 2}" height="8"/>
                </clipPath>
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
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <style>
                ${fontFace}
                text { font-family: ${fontFamily}; }
            </style>

            <rect width="100%" height="100%" fill="url(#spaceGradient)" />
            ${stars}

            <!-- Grid lines (subtle) -->
            <g opacity="0.12">
                ${Array.from({ length: 24 }, (_, i) => {
            const x = ((i + 1) * (width / 24)) | 0;
            return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${theme.iconColor}" stroke-width="0.5"/>`;
        }).join('')}
                ${Array.from({ length: 12 }, (_, i) => {
            const y = ((i + 1) * (height / 12)) | 0;
            return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${theme.iconColor}" stroke-width="0.5"/>`;
        }).join('')}
            </g>

            <!-- Title -->
            <text x="50%" y="90" text-anchor="middle" fill="${theme.titleColor}" font-size="42" font-family="${fontFamily}" font-weight="700" style="filter: drop-shadow(0 0 12px ${theme.titleColor}66)">${data.username}'s Activity ${data.year}</text>

            <text x="50%" y="125" text-anchor="middle" fill="${theme.textColor}" font-size="18" opacity="0.8" font-family="${fontFamily}" filter="url(#textGlow)">${data.totalContributions.toLocaleString()} total contributions</text>

            <g>
                ${cells}
                ${monthElements.join('')}
            </g>

            <!-- Legend -->
            <g transform="translate(${startX + gridWidth - 100}, ${startY + gridHeight + 25})">
                <text x="-35" y="10" fill="${theme.textColor}" font-size="10" opacity="0.5" font-family="${fontFamily}">Less</text>
                ${levelColors.map((c, i) => `<rect x="${i * 15}" y="0" width="12" height="12" fill="${c}" rx="2" opacity="${i === 0 ? 0.3 : 0.9}" />`).join('')}
                <text x="${levelColors.length * 15 + 5}" y="10" fill="${theme.textColor}" font-size="10" opacity="0.5" font-family="${fontFamily}">More</text>
            </g>
        </svg>`;
    }
}
