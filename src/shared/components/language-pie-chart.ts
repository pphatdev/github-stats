import { LanguageCount, LanguagesPieChartOptions } from "../types/language.types.js";
import { getTheme } from '../utils/themes.js';

export class LanguagePieChartRenderer {
    private static readonly SIZE_PRESETS: Record<string, { WIDTH: number; HEIGHT: number }> = {
        small: { WIDTH: 400, HEIGHT: 200 },
        medium: { WIDTH: 600, HEIGHT: 300 },
        default: { WIDTH: 512, HEIGHT: 256 },
        large: { WIDTH: 1000, HEIGHT: 500 },
    };

    static generatePieChart(languages: LanguageCount[], options: LanguagesPieChartOptions): string {
        const theme = getTheme(options.theme, {
            bgColor: options.bgColor,
            borderColor: options.borderColor,
            textColor: options.textColor,
            titleColor: options.titleColor,
        });
        const fontName = theme.fontName || 'Orbitron';
        const fontFamily = theme.fontFamily || `'${fontName}', 'Ubuntu', 'sans-serif'`;
        const fontUrl = theme.fontUrl || '/fonts/orbitron.woff2';
        const fontFace = fontUrl
            ? `@font-face { font-family: '${fontName}'; font-style: normal; font-weight: 400 900; font-display: swap; src: url(${fontUrl}) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }`
            : '';

        // Extract RGB values from theme colors for gradients
        const extractHSL = (hslString: string): { h: number; s: number; l: number } => {
            const match = hslString.match(/\d+/g);
            if (match && match.length >= 3) {
                return { h: parseInt(match[0]), s: parseInt(match[1]), l: parseInt(match[2]) };
            }
            return { h: 200, s: 70, l: 50 };
        };

        const themeColors = {
            primary: theme.titleColor,
            accent: theme.iconColor,
            text: theme.textColor,
        };

        const { WIDTH: width, HEIGHT: height } =
            LanguagePieChartRenderer.SIZE_PRESETS[options.size ?? 'default'] ?? LanguagePieChartRenderer.SIZE_PRESETS.default;

        const scale = width / 1200;
        const centerX = width / 2;
        const centerY = height / 2;
        const padding = 20;

        const sortedLanguages = [...languages]
            .filter(lang => lang.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);

        const totalCount = sortedLanguages.reduce((sum, lang) => sum + lang.count, 0) || 1;
        const listLength = options.listLength ?? 8;
        const topLanguagesCount = Math.min(Math.max(listLength, 0), sortedLanguages.length);

        const hashString = (value: string): number => {
            let hash = 0;
            for (let i = 0; i < value.length; i += 1) {
                hash = (hash << 5) - hash + value.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        };

        const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
            const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
            return {
                x: cx + (radius * Math.cos(angleInRadians)),
                y: cy + (radius * Math.sin(angleInRadians)),
            };
        };

        const describeArc = (cx: number, cy: number, outerRadius: number, innerRadius: number, startAngle: number, endAngle: number) => {
            const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
            const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
            const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
            const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);
            const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

            return [
                `M ${startOuter.x.toFixed(1)} ${startOuter.y.toFixed(1)}`,
                `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x.toFixed(1)} ${endOuter.y.toFixed(1)}`,
                `L ${startInner.x.toFixed(1)} ${startInner.y.toFixed(1)}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endInner.x.toFixed(1)} ${endInner.y.toFixed(1)}`,
                'Z',
            ].join(' ');
        };

        const s = (n: number) => n * scale;
        const si = (n: number) => Math.round(n * scale);

        // Generate tech grid pattern lines radiating from center
        const gridLines = Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = centerX + Math.cos(angle) * s(120);
            const y1 = centerY + Math.sin(angle) * s(120);
            const x2 = centerX + Math.cos(angle) * s(240);
            const y2 = centerY + Math.sin(angle) * s(240);
            return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.15" />`;
        }).join('');

        // Generate concentric circles for tech look
        const techCircles = Array.from({ length: 4 }, (_, i) => {
            const r = s(100 + i * 40);
            return `<circle cx="${centerX}" cy="${centerY}" r="${r}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(0.8).toFixed(1)}" opacity="${(0.1 - i * 0.04).toFixed(2)}" />`;
        }).join('');

        // Generate pie slices with neon effect
        const outerRadius = s(180);
        const innerRadius = s(90);
        let startAngle = -90;

        const slices = sortedLanguages.map((lang, index) => {
            const hash = hashString(lang.name);
            const hue = hash % 360;
            const accent = `hsl(${hue}, 85%, 55%)`;
            const accentGlow = `hsl(${hue}, 100%, 65%)`;
            const share = (lang.count / totalCount) * 100;
            const sweep = Math.max(2, (share / 100) * 360);
            const endAngle = startAngle + sweep;
            const midAngle = (startAngle + endAngle) / 2;
            const path = describeArc(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);

            // Label position
            const labelRadius = (outerRadius + innerRadius) / 2;
            const labelPos = polarToCartesian(centerX, centerY, labelRadius, midAngle);

            startAngle = endAngle;

            return `
                <g class="pie-slice tech-slice" style="animation-delay:${(index * 0.12).toFixed(2)}s">
                    <!-- Glow layer -->
                    <path d="${path}" fill="none" stroke="${accentGlow}" stroke-width="${s(3).toFixed(1)}" opacity="0.2" filter="url(#neonGlow)"/>
                    <!-- Main slice -->
                    <path d="${path}" fill="${accent}" opacity="0.65" stroke="${accentGlow}" stroke-width="${s(1.5).toFixed(1)}" filter="url(#innerGlow)">
                        <title>${lang.name} - ${share.toFixed(1)}%</title>
                    </path>
                    ${share > 5 ? `<text x="${labelPos.x.toFixed(1)}" y="${labelPos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${theme.textColor}" font-size="${si(12)}" font-weight="700" letter-spacing="${s(1).toFixed(1)}" filter="url(#textGlow)">${share.toFixed(0)}%</text>` : ''}
                </g>
            `;
        }).join('');

        // Generate futuristic legend with tech styling
        const legendStartX = width - s(260);
        const legendStartY = padding + s(50);
        const legendItemHeight = s(26);
        const legendBoxWidth = s(220);
        const legendBoxHeight = Math.min(topLanguagesCount * legendItemHeight + s(30), height - padding * 2);

        const legend = sortedLanguages.slice(0, topLanguagesCount).map((lang, idx) => {
            const hash = hashString(lang.name);
            const hue = hash % 360;
            const accent = `hsl(${hue}, 85%, 55%)`;
            const accentLight = `hsl(${hue}, 100%, 70%)`;
            const share = (lang.count / totalCount) * 100;
            const y = legendStartY + s(20) + idx * legendItemHeight;

            return `
                <g class="legend-item tech-item" style="animation-delay:${(0.4 + idx * 0.08).toFixed(2)}s">
                    <!-- Indicator dot -->
                    <circle cx="${legendStartX + s(12)}" cy="${y - s(2)}" r="${s(5)}" fill="${accent}" opacity="0.60" filter="url(#dotGlow)" />
                    <!-- Language name -->
                    <text x="${legendStartX + s(24)}" y="${y + s(3)}" fill="${theme.textColor}" font-size="${si(13)}" font-weight="600" letter-spacing="${s(0.5)}">${lang.name}</text>
                    <!-- Percentage -->
                    <text x="${legendStartX + legendBoxWidth - s(12)}" y="${y + s(3)}" text-anchor="end" fill="${accentLight}" font-size="${si(12)}" font-weight="700" letter-spacing="${s(1)}">${share.toFixed(1)}%</text>
                </g>
            `;
        }).join('');

        // Generate quantum particles
        const particles = Array.from({ length: 60 }, (_, i) => {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const duration = 3 + Math.random() * 4;
            const size = 0.5 + Math.random() * 1.5;
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${theme.iconColor}" opacity="${(Math.random() * 0.3 + 0.1).toFixed(2)}" class="quantum-particle" style="animation-duration:${duration.toFixed(1)}s; animation-delay:${(Math.random() * 2).toFixed(1)}s" />`;
        }).join('');

        return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Advanced gradient backgrounds -->
                <radialGradient id="futureBg" cx="50%" cy="50%" r="80%">
                    <stop offset="0%" style="stop-color:${theme.bgColor};stop-opacity:1" />
                    <stop offset="40%" style="stop-color:#0a0e2e;stop-opacity:0.9" />
                    <stop offset="80%" style="stop-color:#050810;stop-opacity:0.95" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
                </radialGradient>

                <linearGradient id="techAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0.8" />
                    <stop offset="50%" style="stop-color:${theme.titleColor};stop-opacity:0.5" />
                    <stop offset="100%" style="stop-color:${theme.iconColor};stop-opacity:0.3" />
                </linearGradient>

                <!-- Neon glow effects -->
                <filter id="neonGlow" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="${s(4)}" result="blur1"/>
                    <feGaussianBlur in="SourceGraphic" stdDeviation="${s(8)}" result="blur2"/>
                    <feMerge>
                        <feMergeNode in="blur2"/>
                        <feMergeNode in="blur1"/>
                    </feMerge>
                </filter>

                <filter id="innerGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="${s(1.5)}" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>

                <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="${s(2)}" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>

                <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="${s(1)}" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>

                <!-- Data flow pattern -->
                <pattern id="dataFlow" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="40" y2="40" stroke="${theme.iconColor}" stroke-width="0.5" opacity="0.1" />
                    <line x1="40" y1="0" x2="0" y2="40" stroke="${theme.iconColor}" stroke-width="0.5" opacity="0.1" />
                </pattern>
            </defs>

            <style>
                ${fontFace}

                text {
                    font-family: ${fontFamily};
                    font-weight: 700;
                    letter-spacing: ${s(0.5)}px;
                }

                @keyframes fadeInScale {
                    0% { opacity: 0; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }

                @keyframes slideInRight {
                    0% { opacity: 0; transform: translateX(30px); }
                    100% { opacity: 1; transform: translateX(0); }
                }

                @keyframes pulseGlow {
                    0%, 100% { filter: drop-shadow(0 0 8px currentColor); }
                    50% { filter: drop-shadow(0 0 16px currentColor); }
                }

                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }

                @keyframes drift {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(2px, -2px); }
                }

                @keyframes floatParticle {
                    0% { transform: translate(0, 0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translate(var(--tx), var(--ty)); opacity: 0; }
                }

                .tech-slice {
                    animation: fadeInScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    transform-origin: ${centerX}px ${centerY}px;
                }

                .tech-item {
                    animation: slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }

                .quantum-particle {
                    animation: floatParticle 6s linear infinite;
                    --tx: calc((Math.random() - 0.5) * ${s(400)}px);
                    --ty: calc((Math.random() - 0.5) * ${s(300)}px);
                }
            </style>

            <!-- Background with futuristic grid -->
            <rect width="${width}" height="${height}" fill="url(#futureBg)" />
            <rect width="${width}" height="${height}" fill="url(#dataFlow)" />
            <rect width="${width}" height="${height}" fill="#000000" opacity="0.2" />

            <!-- Scan line effect -->
            <rect width="${width}" height="${s(2)}" fill="${theme.iconColor}" opacity="0.05" class="scan-line" style="animation: scan 8s linear infinite" />

            <!-- Tech grid lines -->
            <g class="tech-grid" opacity="0.05">
                ${gridLines}
            </g>

            <!-- Concentric tech circles -->
            <g class="tech-circles">
                ${techCircles}
            </g>

            <!-- Quantum particles -->
            <g class="particles" opacity="0.6">
                ${particles}
            </g>

            <!-- Central ring highlight -->
            <circle cx="${centerX}" cy="${centerY}" r="${innerRadius - s(8)}" fill="none" stroke="url(#techAccent)" stroke-width="${s(1.5).toFixed(1)}" opacity="0.40" />
            <circle cx="${centerX}" cy="${centerY}" r="${outerRadius + s(8)}" fill="none" stroke="url(#techAccent)" stroke-width="${s(1).toFixed(1)}" opacity="0.25" />

            <!-- Pie chart slices -->
            <g class="pie-chart">
                ${slices}
            </g>

            <!-- Center display -->
            <circle cx="${centerX}" cy="${centerY}" r="${innerRadius - s(12)}" fill="${theme.bgColor}" opacity="0.30" />
            <circle cx="${centerX}" cy="${centerY}" r="${innerRadius - s(10)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.50" />

            <!-- Title with tech styling -->
            <text x="${centerX}" y="${centerY - s(18)}" text-anchor="middle" fill="${theme.titleColor}" font-size="${si(20)}" font-weight="700" letter-spacing="${s(2)}" filter="url(#textGlow)">[ TOP ${topLanguagesCount} ]</text>
            <text x="${centerX}" y="${centerY + s(12)}" text-anchor="middle" fill="${theme.iconColor}" font-size="${si(13)}" font-weight="700" letter-spacing="${s(2)}" opacity="0.60">LANGUAGES</text>

            <!-- Legend panel with tech border -->
            <g class="legend-panel">
                <!-- Panel background -->
                <rect x="${legendStartX - s(10)}" y="${legendStartY - s(15)}" width="${legendBoxWidth + s(20)}" height="${legendBoxHeight + s(30)}" rx="${s(4)}" fill="${theme.bgColor}" fill-opacity="0.15" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" stroke-opacity="0.6" />
                <!-- Corner accents -->
                <line x1="${legendStartX - s(5)}" y1="${legendStartY}" x2="${legendStartX - s(5)}" y2="${legendStartY + s(15)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.8" />
                <line x1="${legendStartX}" y1="${legendStartY - s(10)}" x2="${legendStartX + s(20)}" y2="${legendStartY - s(10)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.8" />
            </g>

            <!-- Legend items -->
            <g class="legend" filter="url(#textGlow)">
                ${legend}
            </g>
        </svg>
        `.trim();
    }
}
