import { LanguageCount, LanguagesCardOptions } from "../types/language.types.js";
import { getTheme } from '../utils/themes.js';

export class LanguageCardRenderer {
    static generateLanguagesCard(languages: LanguageCount[], options: LanguagesCardOptions): string {
        const theme = getTheme(options.theme, {
            bgColor: options.bgColor,
            borderColor: options.borderColor,
            textColor: options.textColor,
            titleColor: options.titleColor,
        });
        const dataBorderStyle = options.dataBorderStyle || 'solid';
        const dataBorderFramePosition = options.dataBorderFramePosition || 'out';
        const showDataBorderStroke = dataBorderStyle === 'solid';
        const showDataBorderFrame = dataBorderStyle === 'frame';
        const fontName = theme.fontName || 'Orbitron';
        const fontFamily = theme.fontFamily || `'${fontName}', 'Ubuntu', 'sans-serif'`;
        const fontUrl = theme.fontUrl || '/fonts/orbitron.woff2';
        const fontFace = fontUrl
            ? `@font-face { font-family: '${fontName}'; font-style: normal; font-weight: 400 900; font-display: swap; src: url(${fontUrl}) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }`
            : '';
        const width = 1200;
        const height = 600;
        const centerX = width / 2;
        const centerY = height / 2;
        const padding = 40;

        const sortedLanguages = [...languages]
            .filter(lang => lang.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        const totalCount = sortedLanguages.reduce((sum, lang) => sum + lang.count, 0) || 1;
        const maxCount = Math.max(...sortedLanguages.map(lang => lang.count), 1);
        const listLength = options.listLength ?? 5;
        const topLanguagesCount = Math.min(Math.max(listLength, 0), sortedLanguages.length);

        const hashString = (value: string): number => {
            let hash = 0;
            for (let i = 0; i < value.length; i += 1) {
                hash = (hash << 5) - hash + value.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        };

        const spacingJitter = (seed: number, min: number, max: number): number => {
            const range = max - min;
            return min + (seed % (range + 1));
        };

        const bubbles = sortedLanguages.map((lang, index) => {
            const hash = hashString(lang.name);
            const baseAngle = (index / Math.max(sortedLanguages.length, 1)) * Math.PI * 2;
            const angleOffset = ((hash % 30) - 15) * (Math.PI / 180);
            const angle = baseAngle + angleOffset;
            const ringRadius = 180 + (hash % 80);
            const share = (lang.count / totalCount) * 100;
            const percent = Math.round(share);
            const radius = 38 + (lang.count / maxCount) * 92;
            const hue = hash % 360;
            const accent = `hsl(${hue}, 70%, 60%)`;
            const accentSoft = `hsla(${hue}, 70%, 60%, 0.45)`;
            const jitterX = spacingJitter(hash + index * 13, -22, 22);
            const jitterY = spacingJitter(hash + index * 29, -18, 18);

            let x = centerX + Math.cos(angle) * ringRadius;
            let y = centerY + Math.sin(angle) * ringRadius;
            x += jitterX;
            y += jitterY;
            x = Math.min(width - padding - radius, Math.max(padding + radius, x));
            y = Math.min(height - padding - radius, Math.max(padding + radius, y));

            return {
                name: lang.name,
                count: lang.count,
                percent,
                share,
                x,
                y,
                radius,
                accent,
                accentSoft,
            };
        });

        const titleBarStops = bubbles.length
            ? (() => {
                let offset = 0;
                return bubbles.map((bubble) => {
                    const start = offset;
                    offset = Math.min(100, offset + bubble.share);
                    return `<stop offset="${start.toFixed(1)}%" stop-color="${bubble.accent}"/><stop offset="${offset.toFixed(1)}%" stop-color="${bubble.accent}"/>`;
                }).join('');
            })()
            : `<stop offset="0%" stop-color="${theme.iconColor}"/><stop offset="100%" stop-color="${theme.iconColor}"/>`;

        const starField = Array.from({ length: 60 }, (_, i) => {
            const x = ((i * 113) % width).toFixed(0);
            const y = ((i * 61) % height).toFixed(0);
            const r = (1 + (i % 3)).toFixed(1);
            const opacity = (0.2 + (i % 4) * 0.08).toFixed(2);
            const duration = (i % 3 === 0 ? 3 : i % 3 === 1 ? 5 : 7);
            const begin = (i % 10) * 0.2;
            const minOpacity = (parseFloat(opacity) * 0.3).toFixed(2);
            
            return `
                <circle cx="${x}" cy="${y}" r="${r}" fill="${theme.textColor}" opacity="${opacity}">
                    <animate attributeName="opacity" values="${opacity};${minOpacity};${opacity}" dur="${duration}s" begin="${begin}s" repeatCount="indefinite" />
                </circle>`;
        }).join('');

        const bubbleNodes = bubbles.map((bubble, index) => {
            const delay = ((index * 0.4) + (hashString(bubble.name) % 8) * 0.1).toFixed(1);
            const size = bubble.radius * 2;
            const corner = Math.max(6, Math.min(14, bubble.radius * 0.25));
            const frameLength = Math.max(10, Math.min(22, bubble.radius * 0.4));
            const frameInset = 2;
            const x = bubble.x - bubble.radius;
            const y = bubble.y - bubble.radius;
            const innerX = x + frameInset;
            const innerY = y + frameInset;
            const innerW = size - frameInset * 2;
            const innerH = size - frameInset * 2;
            return `
                <g class="bubble" style="animation-delay:${delay}s">
                    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${corner.toFixed(1)}" fill="url(#bubbleFill)" opacity="0.2"/>
                    <rect x="${(x + 6).toFixed(1)}" y="${(y + 6).toFixed(1)}" width="${(size - 12).toFixed(1)}" height="${(size - 12).toFixed(1)}" rx="${Math.max(2, corner - 4).toFixed(1)}" fill="none" stroke="${bubble.accentSoft}" stroke-width="1" opacity="0.55"/>
                    <path d="M ${innerX} ${innerY + frameLength} V ${innerY} H ${innerX + frameLength}" fill="none" stroke="${bubble.accent}" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M ${innerX + innerW - frameLength} ${innerY} H ${innerX + innerW} V ${innerY + frameLength}" fill="none" stroke="${bubble.accent}" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M ${innerX} ${innerY + innerH - frameLength} V ${innerY + innerH} H ${innerX + frameLength}" fill="none" stroke="${bubble.accent}" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M ${innerX + innerW - frameLength} ${innerY + innerH} H ${innerX + innerW} V ${innerY + innerH - frameLength}" fill="none" stroke="${bubble.accent}" stroke-width="1.6" stroke-linecap="round"/>
                    <rect x="${(x + 10).toFixed(1)}" y="${(y + 10).toFixed(1)}" width="${(size - 20).toFixed(1)}" height="${(size - 20).toFixed(1)}" rx="${Math.max(2, corner - 6).toFixed(1)}" fill="url(#bubbleGlow)" opacity="0.22" filter="url(#glow)"/>
                    <text x="${bubble.x.toFixed(1)}" y="${(bubble.y - 8).toFixed(1)}" text-anchor="middle" fill="${theme.textColor}" font-size="16" font-weight="700" filter="url(#glow)">${bubble.name}</text>
                    <text x="${bubble.x.toFixed(1)}" y="${(bubble.y + 18).toFixed(1)}" text-anchor="middle" fill="${bubble.accent}" font-size="14" font-weight="600">${bubble.percent}%</text>
                </g>
            `;
        }).join('');

        const infoCard = (() => {
            if (options.showInfo === false) return '';
            if (!sortedLanguages.length) return '';
            if (listLength <= 0) return '';

            const items = sortedLanguages.slice(0, listLength);
            const cardWidth = 280;
            const headerHeight = 28;
            const rowHeight = 18;
            const listOffset = 24;
            const frameInset = dataBorderFramePosition === 'out' ? -6 : 6;
            const cornerSize = 10;
            const frameStroke = 2;
            const cardHeight = headerHeight + (items.length * rowHeight) + 14 + listOffset;
            const infoSeed = hashString(`info-${sortedLanguages[0]?.name ?? 'default'}`);
            const infoOffsetX = spacingJitter(infoSeed, -18, 18);
            const infoOffsetY = spacingJitter(infoSeed + 17, -14, 14);
            const cardX = width - padding - cardWidth + infoOffsetX;
            const cardY = height - padding - cardHeight + infoOffsetY;
            const cardAccent = bubbles[0]?.accent || theme.iconColor;
            const frameX = cardX + frameInset;
            const frameY = cardY + frameInset;
            const frameW = cardWidth - (frameInset * 2);
            const frameH = cardHeight - (frameInset * 2);

            const rows = items.map((item, idx) => {
                const itemPercent = Math.round((item.count / totalCount) * 100);
                const accent = bubbles.find((bubble) => bubble.name === item.name)?.accent || theme.iconColor;
                const y = cardY + headerHeight + listOffset + (idx * rowHeight) + 6;
                return `
                    <text x="${cardX + 16}" y="${y}" fill="${accent}" font-size="12" font-weight="700">${idx + 1}.</text>
                    <text x="${cardX + 34}" y="${y}" fill="${theme.textColor}" font-size="12" font-weight="600">${item.name}</text>
                    <text x="${cardX + cardWidth - 16}" y="${y}" text-anchor="end" fill="${accent}" font-size="12" font-weight="700">${itemPercent}%</text>
                `;
            }).join('');

            return `
                <g class="info-card">
                    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="12" fill="${theme.bgColor}" opacity="0.5" stroke="${showDataBorderStroke ? cardAccent : 'none'}" stroke-width="1"/>
                    <path d="M ${frameX} ${frameY + cornerSize} V ${frameY} H ${frameX + cornerSize}" fill="none" stroke="${showDataBorderFrame ? cardAccent : 'none'}" stroke-width="${frameStroke}" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M ${frameX + frameW - cornerSize} ${frameY} H ${frameX + frameW} V ${frameY + cornerSize}" fill="none" stroke="${showDataBorderFrame ? cardAccent : 'none'}" stroke-width="${frameStroke}" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M ${frameX} ${frameY + frameH - cornerSize} V ${frameY + frameH} H ${frameX + cornerSize}" fill="none" stroke="${showDataBorderFrame ? cardAccent : 'none'}" stroke-width="${frameStroke}" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M ${frameX + frameW - cornerSize} ${frameY + frameH} H ${frameX + frameW} V ${frameY + frameH - cornerSize}" fill="none" stroke="${showDataBorderFrame ? cardAccent : 'none'}" stroke-width="${frameStroke}" stroke-linecap="round" stroke-linejoin="round"/>
                    <text x="${cardX + 16}" y="${cardY + 25}" fill="${theme.textColor}" font-size="12" letter-spacing="1" opacity="0.8">TOP ${topLanguagesCount} LANGUAGES</text>
                    <rect x="${cardX + 12}" y="${cardY + 30}" width="${cardWidth - 24}" height="5" rx="3" fill="url(#titleBarGradient)" opacity="0.95"/>
                    ${rows}
                </g>
            `;
        })();

        return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="bgGradient" cx="50%" cy="50%" r="70%">
                    <stop offset="0%" style="stop-color:${theme.bgColor};stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#02030a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
                </radialGradient>

                <radialGradient id="nebulaGradient" cx="30%" cy="35%" r="65%">
                    <stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0.14" />
                    <stop offset="50%" style="stop-color:${theme.titleColor};stop-opacity:0.07" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0" />
                </radialGradient>

                <radialGradient id="galaxyGradient" cx="70%" cy="25%" r="60%">
                    <stop offset="0%" style="stop-color:${theme.titleColor};stop-opacity:0.22" />
                    <stop offset="45%" style="stop-color:${theme.iconColor};stop-opacity:0.12" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0" />
                </radialGradient>

                <pattern id="gridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${theme.iconColor}" stroke-width="1" opacity="0.08"/>
                </pattern>

                <radialGradient id="bubbleFill" cx="35%" cy="35%" r="70%">
                    <stop offset="0%" style="stop-color:${theme.bgColor};stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:${theme.borderColor};stop-opacity:0.6" />
                </radialGradient>

                <radialGradient id="bubbleGlow" cx="50%" cy="45%" r="60%">
                    <stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:${theme.titleColor};stop-opacity:0" />
                </radialGradient>

                <radialGradient id="planetBody" cx="35%" cy="35%" r="70%">
                    <stop offset="0%" style="stop-color:${theme.titleColor};stop-opacity:0.55" />
                    <stop offset="60%" style="stop-color:${theme.iconColor};stop-opacity:0.32" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.28" />
                </radialGradient>

                <radialGradient id="planetGlow" cx="50%" cy="50%" r="70%">
                    <stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0.18" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0" />
                </radialGradient>

                <linearGradient id="planetRim" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0" />
                    <stop offset="50%" style="stop-color:${theme.iconColor};stop-opacity:0.4" />
                    <stop offset="100%" style="stop-color:${theme.iconColor};stop-opacity:0" />
                </linearGradient>

                <linearGradient id="shipBody" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:${theme.titleColor};stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:${theme.iconColor};stop-opacity:0.9" />
                </linearGradient>

                <linearGradient id="shipGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0" />
                    <stop offset="50%" style="stop-color:${theme.iconColor};stop-opacity:0.5" />
                    <stop offset="100%" style="stop-color:${theme.iconColor};stop-opacity:0" />
                </linearGradient>

                <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="1.8" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>

                <linearGradient id="titleBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    ${titleBarStops}
                </linearGradient>
            </defs>

            <style>
                ${fontFace}

                text {
                    font-family: ${fontFamily};
                    font-weight: 700;
                }

                @keyframes floatY {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                @keyframes drift {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(12px, -8px); }
                }

                @keyframes spaceFloat {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-6px, -4px); }
                }

                @keyframes spaceDrift {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(5px, 6px); }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .bubble {
                    animation: floatY 6s ease-in-out infinite;
                    transform-origin: ${centerX}px ${centerY}px;
                }

                .space-icons {
                    animation: spaceFloat 12s ease-in-out infinite;
                }

                .space-icons .ship-rocket {
                    animation: spaceDrift 9s ease-in-out infinite;
                }

                .space-icons .ship-ufo {
                    animation: spaceFloat 10s ease-in-out infinite reverse;
                }

                .rings {
                    animation: spin 80s linear infinite;
                    transform-origin: ${centerX}px ${centerY}px;
                }
            </style>

            <rect width="${width}" height="${height}" fill="url(#bgGradient)" />
            <rect width="${width}" height="${height}" fill="#000000" opacity="0.22" />
            <rect width="${width}" height="${height}" fill="url(#nebulaGradient)" opacity="0.38" />
            <ellipse cx="860" cy="170" rx="240" ry="140" fill="url(#galaxyGradient)" opacity="0.6" />
            <rect width="${width}" height="${height}" fill="url(#gridPattern)" opacity="0.18" />
            <g opacity="0.1">
                ${Array.from({ length: 24 }, (_, i) => {
                    const x = (i + 1) * (width / 24);
                    return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${theme.iconColor}" stroke-width="0.5"/>`;
                }).join('')}
                ${Array.from({ length: 12 }, (_, i) => {
                    const y = (i + 1) * (height / 12);
                    return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${theme.iconColor}" stroke-width="0.5"/>`;
                }).join('')}
            </g>
            <g>${starField}</g>

            <g class="space-icons" opacity="0.5">
                <g transform="translate(140 220)">
                    <ellipse cx="0" cy="10" rx="10" ry="16" fill="${theme.titleColor}" opacity="0.9" />
                    <path d="M -10 10 L 0 -18 L 10 10 Z" fill="${theme.iconColor}" opacity="0.9" />
                    <circle cx="0" cy="4" r="4" fill="${theme.textColor}" opacity="0.75" />
                    <path d="M -5 22 L 0 32 L 5 22 Z" fill="${theme.iconColor}" opacity="0.7" />
                </g>
                    <g transform="translate(195 285)">
                    <ellipse cx="0" cy="0" rx="20" ry="6" fill="${theme.iconColor}" opacity="0.8" />
                    <ellipse cx="0" cy="-6" rx="10" ry="4" fill="${theme.titleColor}" opacity="0.8" />
                    <circle cx="-8" cy="0" r="1.5" fill="${theme.textColor}" opacity="0.7" />
                    <circle cx="0" cy="0" r="1.5" fill="${theme.textColor}" opacity="0.7" />
                    <circle cx="8" cy="0" r="1.5" fill="${theme.textColor}" opacity="0.7" />
                </g>
            </g>
            <g opacity="0.75">
                <circle cx="${centerX}" cy="${centerY}" r="110" fill="url(#planetGlow)" opacity="0.6" />
                <circle cx="${centerX}" cy="${centerY}" r="85" fill="url(#planetBody)" />
                <ellipse cx="${centerX}" cy="${centerY}" rx="118" ry="28" fill="url(#planetRim)" opacity="0.78" />
            </g>

            <g opacity="0.85">
                ${bubbleNodes}
            </g>

            <g class="rings" opacity="0.5">
                <circle cx="${centerX}" cy="${centerY}" r="140" fill="none" stroke="${theme.iconColor}" stroke-dasharray="10 8" stroke-width="1"/>
                <circle cx="${centerX}" cy="${centerY}" r="210" fill="none" stroke="${theme.iconColor}" stroke-dasharray="6 10" stroke-width="1" opacity="0.4"/>
            </g>

            <text class="title" x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" fill="${theme.titleColor}" font-size="20" font-weight="700" letter-spacing="0">TOP LANGUAGES</text>

            ${infoCard}
        </svg>
        `.trim();
    }
}
