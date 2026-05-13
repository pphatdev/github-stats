import { StatsCardOptions } from "../../modules/stats/stats.types.js";
import { GitHubStats } from "../types/github.types.js";
import { getTheme } from '../utils/themes.js';

export class CardRenderer {
    // Cache static starfield to avoid regenerating
    private static readonly STARFIELD_CACHE = new Map<string, string>();

    // Reusable static values
    // Reusable static values
    static readonly DIMENSIONS = { WIDTH: 800, HEIGHT: 400 };
    private static readonly SIZE_PRESETS: Record<string, { WIDTH: number; HEIGHT: number }> = {
        small: { WIDTH: 400, HEIGHT: 200 },
        medium: { WIDTH: 600, HEIGHT: 300 },
        default: { WIDTH: 800, HEIGHT: 400 },
        large: { WIDTH: 1200, HEIGHT: 600 },
    };
    static readonly ORBIT_RADII = [120, 180, 240];
    static readonly STAT_ANGLES = [0, 72, 144, 216, 288];

    // Format number helper
    private static formatNumber(num: number): string {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    // Generate deterministic starfield based on theme (cached)
    private static getStarfield(width: number, height: number, textColor: string): string {
        const cacheKey = `${width}-${height}-${textColor}`;
        if (this.STARFIELD_CACHE.has(cacheKey)) {
            return this.STARFIELD_CACHE.get(cacheKey)!;
        }

        // Seeded pseudo-random for consistent starfield
        let seed = 12345;
        const seededRandom = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        const stars = Array.from({ length: 30 }, () => {
            const x = Math.floor(seededRandom() * width);
            const y = Math.floor(seededRandom() * height);
            const r = (seededRandom() * 1 + 0.5).toFixed(1);
            const opacity = (seededRandom() * 0.7 + 0.3).toFixed(1);
            const duration = (seededRandom() * 3 + 2).toFixed(1);
            const delay = (seededRandom() * 5).toFixed(1);
            return `<circle cx="${x}" cy="${y}" r="${r}" fill="${textColor}" opacity="${opacity}">
                <animate attributeName="opacity" values="${opacity};${(parseFloat(opacity) * 0.3).toFixed(1)};${opacity}" dur="${duration}s" begin="${delay}s" repeatCount="indefinite" />
            </circle>`;
        }).join('');

        this.STARFIELD_CACHE.set(cacheKey, stars);
        return stars;
    }

    // Render panel frame
    private static renderFrameCorners(width: number, height: number, offset: number, iconColor: string): string {
        const corner = 14;
        const x1 = offset, y1 = offset;
        const x2 = width - offset, y2 = height - offset;
        return `<g stroke="${iconColor}" stroke-width="2" fill="none" opacity="0.7"><path d="M ${x1} ${y1 + corner} V ${y1} H ${x1 + corner}"/><path d="M ${x2 - corner} ${y1} H ${x2} V ${y1 + corner}"/><path d="M ${x1} ${y2 - corner} V ${y2} H ${x1 + corner}"/><path d="M ${x2 - corner} ${y2} H ${x2} V ${y2 - corner}"/></g>`;
    }

    static generateStatsCard(stats: GitHubStats, options: StatsCardOptions): string {
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
            ? `@font-face{font-family:'${fontName}';font-style:normal;font-weight:400 900;font-display:swap;src:url(${fontUrl})format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`
            : '';

        const dataBorderFrameOffset = (options.dataBorderFramePosition || 'out') === 'out' ? -6 : 6;
        const showDataBorderStroke = (options.dataBorderStyle || 'solid') === 'solid';
        const showDataBorderFrame = (options.dataBorderStyle || 'solid') === 'frame';
        const avatarMode = options.avatarMode || 'radar';
        const customTitle = options.customTitle || `${stats.name}'s GitHub Stats`;

        const { WIDTH: width, HEIGHT: height } =
            CardRenderer.SIZE_PRESETS[options.size ?? 'default'] ?? CardRenderer.SIZE_PRESETS.default;

        const scale = width / 1200;
        const centerX = width / 2;
        const centerY = height / 2;

        const s = (n: number) => n * scale;
        const si = (n: number) => Math.round(n * scale);

        // Use cached starfield
        const stars = this.getStarfield(width, height, theme.textColor);

        // Removed shooting stars to reduce size
        const shootingStars = '';

        // Generate orbital rings
        const orbitRings = this.ORBIT_RADII.map((r, i) => {
            const opacity = (0.15 - i * 0.03).toFixed(2);
            return `<circle cx="${centerX}" cy="${centerY}" r="${s(r).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" stroke-dasharray="${s(10).toFixed(1)},${s(8).toFixed(1)}" opacity="${opacity}"/>`;
        }).join('');

        // Generate data beams radiating from center
        const statValues = [
            { value: stats.totalStars, label: 'Stars', angle: this.STAT_ANGLES[0] },
            { value: stats.totalCommits, label: 'Commits', angle: this.STAT_ANGLES[1] },
            { value: stats.totalPRs, label: 'PRs', angle: this.STAT_ANGLES[2] },
            { value: stats.totalIssues, label: 'Issues', angle: this.STAT_ANGLES[3] },
            { value: stats.contributedTo, label: 'Contributed', angle: this.STAT_ANGLES[4] }
        ];
        const maxValue = Math.max(...statValues.map(s => s.value));

        // Generate radial beams and data points
        const dataBeams = statValues.map((stat, i) => {
            const angle = (stat.angle * Math.PI) / 180;
            const intensity = maxValue > 0 ? stat.value / maxValue : 0;
            const beamLength = s(100 + (intensity * 140));
            const endX = centerX + Math.cos(angle) * beamLength;
            const endY = centerY + Math.sin(angle) * beamLength;
            const dotX = centerX + Math.cos(angle) * (beamLength + s(20));
            const dotY = centerY + Math.sin(angle) * (beamLength + s(20));
            const labelX = centerX + Math.cos(angle) * (beamLength + s(60));
            const labelY = centerY + Math.sin(angle) * (beamLength + s(60));
            const labelYTop = labelY - s(12);
            const labelYBottom = labelY + s(6);

            return `<line x1="${centerX}" y1="${centerY}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="url(#beamGradient${i})" stroke-width="${s(2).toFixed(1)}" opacity="0.6"/><circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="${s(6).toFixed(1)}" fill="${theme.iconColor}" filter="url(#glow)"/><text x="${labelX.toFixed(1)}" y="${labelYTop.toFixed(1)}" text-anchor="middle" fill="${theme.iconColor}" font-size="${si(11)}" font-weight="600">${stat.label}</text><text x="${labelX.toFixed(1)}" y="${labelYBottom.toFixed(1)}" text-anchor="middle" fill="${theme.textColor}" font-size="${si(20)}" font-weight="700" class="number">${CardRenderer.formatNumber(stat.value)}</text>`;
        }).join('');

        // Corner info panels
        const totalContributions = stats.totalStars + stats.totalCommits + stats.totalPRs + stats.totalIssues;

        // Timestamp for sync info
        const syncTime = new Date().toLocaleTimeString();

        return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Radial gradient for background -->
                <radialGradient id="spaceGradient" cx="50%" cy="50%">
                    <stop offset="0%" style="stop-color:${theme.bgColor};stop-opacity:1" />
                    <stop offset="60%" style="stop-color:#02030a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
                </radialGradient>

                <!-- Glow filter -->
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>

                <!-- Strong glow for center -->
                <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>

                <!-- Beam gradients -->
                ${statValues.map((_, i) => `<linearGradient id="beamGradient${i}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0.1"/><stop offset="100%" style="stop-color:${theme.iconColor};stop-opacity:0.8"/></linearGradient>`).join('')}

                <!-- Circular gradient for center sphere -->
                <radialGradient id="sphereGradient" cx="40%" cy="40%">
                    <stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0.8" />
                    <stop offset="50%" style="stop-color:${theme.titleColor};stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:${theme.borderColor};stop-opacity:0.9" />
                </radialGradient>

                <!-- Planet gradients -->
                <radialGradient id="planetGradient" cx="35%" cy="35%">
                    <stop offset="0%" style="stop-color:#4da6ff;stop-opacity:1" />
                    <stop offset="40%" style="stop-color:#0d47a1;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:#00796b;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#1a237e;stop-opacity:1" />
                </radialGradient>
                <filter id="planetGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>

                <!-- Panel gradient -->
                <linearGradient id="panelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${theme.borderColor};stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:${theme.bgColor};stop-opacity:0.5" />
                </linearGradient>

                <!-- Scan line pattern -->
                <pattern id="scanlines" x="0" y="0" width="100%" height="4" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="100%" y2="0" stroke="${theme.iconColor}" stroke-width="1" opacity="0.05"/>
                </pattern>

                <!-- Shooting star gradient -->
                <linearGradient id="shootingStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${theme.iconColor};stop-opacity:0" />
                    <stop offset="100%" style="stop-color:${theme.textColor};stop-opacity:1" />
                </linearGradient>

                <!-- Circular mask for avatar -->
                <clipPath id="avatarClip">
                    <circle cx="${centerX}" cy="${centerY}" r="${s(65).toFixed(1)}"/>
                </clipPath>
            </defs>

            <style>
                ${fontFace}

                text {
                    font-family: ${fontFamily};
                    font-weight: 700;
                }

                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .rotating {
                    animation: rotate 120s linear infinite;
                    transform-origin: ${centerX}px ${centerY}px;
                }
                .pulsing {
                    animation: pulse 3s ease-in-out infinite;
                }
                .fade-in {
                    animation: fadeIn 3s ease-out forwards;
                }
                .number { font-variant-numeric: tabular-nums; }
            </style>

            <!-- Space background -->
            <rect width="${width}" height="${height}" fill="url(#spaceGradient)" />
            <rect width="${width}" height="${height}" fill="#000000" opacity="0.22" />

            <!-- Starfield -->
            <g opacity="0.8">
                ${stars}
            </g>

            <!-- Shooting stars -->
            <g>
                ${shootingStars}
            </g>

            <!-- Scan lines -->
            <rect width="${width}" height="${height}" fill="url(#scanlines)" opacity="0.3" />

            <!-- Rotating orbital rings -->
            <g class="rotating">
                ${orbitRings}
            </g>

            <!-- Grid lines (subtle) -->
            <g opacity="0.1">
                ${Array.from({ length: 12 }, (_, i) => {
            const x = ((i + 1) * (width / 12)) | 0;
            return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${theme.iconColor}" stroke-width="${s(0.5).toFixed(2)}"/>`;
        }).join('')}
                ${Array.from({ length: 6 }, (_, i) => {
            const y = ((i + 1) * (height / 6)) | 0;
            return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${theme.iconColor}" stroke-width="${s(0.5).toFixed(2)}"/>`;
        }).join('')}
            </g>

            <!-- Data beams -->
            <g class="fade-in">
                ${dataBeams}
            </g>

            <!-- Center sphere (Earth-like) -->
            <g filter="url(#strongGlow)">
                ${avatarMode === 'avatar' ? `
                <!-- Avatar image -->
                <image href="${stats.avatarUrl}" x="${centerX - 65}" y="${centerY - 65}" width="130" height="130" clip-path="url(#avatarClip)" opacity="0.9" />

                <!-- Avatar border and effects -->
                <circle cx="${centerX}" cy="${centerY}" r="65" fill="none" stroke="${theme.iconColor}" stroke-width="3" opacity="0.8" />
                <circle cx="${centerX}" cy="${centerY}" r="70" fill="none" stroke="${theme.iconColor}" stroke-width="1" opacity="0.5" />
                <circle cx="${centerX}" cy="${centerY}" r="80" fill="none" stroke="${theme.iconColor}" stroke-width="2" opacity="0.3" />
                <circle cx="${centerX}" cy="${centerY}" r="75" fill="none" stroke="${theme.iconColor}" stroke-width="1" opacity="0.4" stroke-dasharray="4,4" />

                <!-- Ping animation rings -->
                <circle cx="${centerX}" cy="${centerY}" r="80" fill="none" stroke="${theme.iconColor}" stroke-width="2" opacity="0"><animate attributeName="r" values="80;150;220" dur="5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0.3;0" dur="5s" repeatCount="indefinite"/></circle>
                ` : avatarMode === 'radar' ? `
                <!-- RADAR Visualization -->
                <defs>
                    <!-- Radar glow filter -->
                    <filter id="radarGlow">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    
                    <!-- Radial gradient for radar -->
                    <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:#0a1929;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#051a2a;stop-opacity:1" />
                    </radialGradient>
                </defs>
                
                <!-- Radar background circle -->
                <circle cx="${centerX}" cy="${centerY}" r="${s(65).toFixed(1)}" fill="url(#radarBg)" stroke="${theme.iconColor}" stroke-width="${s(1.5).toFixed(1)}" opacity="0.8" filter="url(#radarGlow)" />
                
                <!-- Radar grid - concentric circles -->
                <circle cx="${centerX}" cy="${centerY}" r="${s(52).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(0.6).toFixed(1)}" opacity="0.4" />
                <circle cx="${centerX}" cy="${centerY}" r="${s(39).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(0.6).toFixed(1)}" opacity="0.4" />
                <circle cx="${centerX}" cy="${centerY}" r="${s(26).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(0.6).toFixed(1)}" opacity="0.4" />
                <circle cx="${centerX}" cy="${centerY}" r="${s(13).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(0.6).toFixed(1)}" opacity="0.4" />
                
                <!-- Radar grid - radial lines -->
                <line x1="${centerX}" y1="${centerY - s(65)}" x2="${centerX}" y2="${centerY + s(65)}" stroke="${theme.iconColor}" stroke-width="${s(0.5).toFixed(1)}" opacity="0.3" />
                <line x1="${centerX - s(65)}" y1="${centerY}" x2="${centerX + s(65)}" y2="${centerY}" stroke="${theme.iconColor}" stroke-width="${s(0.5).toFixed(1)}" opacity="0.3" />
                <line x1="${centerX - s(46)}" y1="${centerY - s(46)}" x2="${centerX + s(46)}" y2="${centerY + s(46)}" stroke="${theme.iconColor}" stroke-width="${s(0.4).toFixed(1)}" opacity="0.2" />
                <line x1="${centerX + s(46)}" y1="${centerY - s(46)}" x2="${centerX - s(46)}" y2="${centerY + s(46)}" stroke="${theme.iconColor}" stroke-width="${s(0.4).toFixed(1)}" opacity="0.2" />
                
                <!-- Rotating radar sweep line -->
                <g style="animation: rotate 4s linear infinite; transform-origin: ${centerX}px ${centerY}px;">
                    <path d="M ${centerX} ${centerY} L ${centerX} ${centerY - s(65)}" stroke="${theme.iconColor}" stroke-width="${s(1.5).toFixed(1)}" opacity="0.8" filter="url(#radarGlow)" />
                    <!-- Sweep gradient tail -->
                    <path d="M ${centerX} ${centerY} L ${centerX - s(15)} ${centerY - s(62)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.4" />
                    <path d="M ${centerX} ${centerY} L ${centerX + s(15)} ${centerY - s(62)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.4" />
                </g>
                
                <!-- Radar blips (data points) -->
                <g fill="${theme.iconColor}" filter="url(#radarGlow)">
                    <circle cx="${centerX - s(20)}" cy="${centerY - s(30)}" r="${s(1.8).toFixed(1)}" opacity="0.9" />
                    <circle cx="${centerX + s(25)}" cy="${centerY - s(15)}" r="${s(1.5).toFixed(1)}" opacity="0.8" />
                    <circle cx="${centerX + s(15)}" cy="${centerY + s(35)}" r="${s(2).toFixed(1)}" opacity="0.85" />
                    <circle cx="${centerX - s(35)}" cy="${centerY + s(10)}" r="${s(1.6).toFixed(1)}" opacity="0.8" />
                    <circle cx="${centerX - s(10)}" cy="${centerY - s(50)}" r="${s(1.9).toFixed(1)}" opacity="0.9" />
                    <circle cx="${centerX + s(35)}" cy="${centerY + s(20)}" r="${s(1.7).toFixed(1)}" opacity="0.85" />
                </g>

                <!-- Pulsing center dot -->
                <circle cx="${centerX}" cy="${centerY}" r="${s(2.5).toFixed(1)}" fill="${theme.iconColor}" filter="url(#radarGlow)">
                    <animate attributeName="r" values="${s(2.5).toFixed(1)};${s(3.5).toFixed(1)};${s(2.5).toFixed(1)}" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite"/>
                </circle>

                <!-- Atmospheric glow -->
                <circle cx="${centerX}" cy="${centerY}" r="${s(70).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.2" />
                <circle cx="${centerX}" cy="${centerY}" r="${s(75).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(0.8).toFixed(1)}" opacity="0.1" stroke-dasharray="${s(3).toFixed(1)},${s(3).toFixed(1)}" />

                <!-- Ping animation rings -->
                <circle cx="${centerX}" cy="${centerY}" r="${s(80).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(2).toFixed(1)}" opacity="0"><animate attributeName="r" values="${s(80).toFixed(1)};${s(150).toFixed(1)};${s(220).toFixed(1)}" dur="5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0.3;0" dur="5s" repeatCount="indefinite"/></circle>
                <circle cx="${centerX}" cy="${centerY}" r="${s(80).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(2).toFixed(1)}" opacity="0"><animate attributeName="r" values="${s(80).toFixed(1)};${s(150).toFixed(1)};${s(220).toFixed(1)}" dur="5s" repeatCount="indefinite" begin="1.67s"/><animate attributeName="opacity" values="0.7;0.3;0" dur="5s" repeatCount="indefinite" begin="1.67s"/></circle>
                <circle cx="${centerX}" cy="${centerY}" r="${s(80).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(2).toFixed(1)}" opacity="0"><animate attributeName="r" values="${s(80).toFixed(1)};${s(150).toFixed(1)};${s(220).toFixed(1)}" dur="5s" repeatCount="indefinite" begin="3.33s"/><animate attributeName="opacity" values="0.7;0.3;0" dur="5s" repeatCount="indefinite" begin="3.33s"/></circle>
                ` : `
                <!-- Solid sphere with background -->
                    <circle cx="${centerX}" cy="${centerY}" r="${s(65).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(3).toFixed(1)}" opacity="0.8" />
                    <circle cx="${centerX}" cy="${centerY}" r="${s(70).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.5" stroke-dasharray="${s(4).toFixed(1)},${s(2).toFixed(1)}" />
                    <circle cx="${centerX}" cy="${centerY}" r="${s(80).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(2).toFixed(1)}" opacity="0.3" />
                    <circle cx="${centerX}" cy="${centerY}" r="${s(60).toFixed(1)}" fill="${theme.iconColor}" opacity="0.3" />
                    <circle cx="${centerX}" cy="${centerY}" r="${s(65).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(2).toFixed(1)}" opacity="0.1" />

                    <!-- Ping animation rings -->
                    <circle cx="${centerX}" cy="${centerY}" r="${s(80).toFixed(1)}" fill="none" stroke="${theme.iconColor}" stroke-width="${s(2).toFixed(1)}" opacity="0"><animate attributeName="r" values="${s(80).toFixed(1)};${s(150).toFixed(1)};${s(220).toFixed(1)}" dur="5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0.3;0" dur="5s" repeatCount="indefinite"/></circle>
                `}
            </g>

            <!-- Top left panel - User info -->
            ${!options.hideTitle ? `
            <g transform="translate(${s(40)}, ${s(40)})">
                <rect width="${s(280)}" height="${s(120)}" rx="${s(8)}" fill="url(#panelGradient)" stroke="${showDataBorderStroke ? theme.iconColor : 'none'}" stroke-width="${s(1).toFixed(1)}" opacity="0.8" />
                ${showDataBorderFrame ? this.renderFrameCorners(s(280), s(120), s(dataBorderFrameOffset), theme.iconColor) : ''}
                <line x1="0" y1="${s(35)}" x2="${s(280)}" y2="${s(35)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.3" />

                <text x="${s(15)}" y="${s(25)}" fill="${theme.titleColor}" font-size="${si(14)}" font-weight="600" letter-spacing="${s(1).toFixed(1)}">${customTitle}</text>
                <text x="${s(15)}" y="${s(55)}" fill="${theme.borderColor}" font-size="${si(11)}" font-weight="500">TOTAL CONTRIBUTIONS</text>
                <text x="${s(15)}" y="${s(85)}" fill="${theme.textColor}" font-size="${si(32)}" font-weight="700"  class="number" filter="url(#glow)">${CardRenderer.formatNumber(totalContributions)}</text>
                <text x="${s(15)}" y="${s(108)}" fill="${theme.iconColor}" font-size="${si(10)}" opacity="0.7">Last synchronized: ${syncTime}</text>
            </g>
            ` : ''}

            <!-- Top right panel - Rank -->
            ${!options.hideRank && stats.rank ? `
            <g transform="translate(${width - s(320)}, ${s(40)})">
                <rect width="${s(280)}" height="${s(120)}" rx="${s(8)}" fill="url(#panelGradient)" stroke="${showDataBorderStroke ? theme.iconColor : 'none'}" stroke-width="${s(1).toFixed(1)}" opacity="0.8"/>
                ${showDataBorderFrame ? this.renderFrameCorners(s(280), s(120), s(dataBorderFrameOffset), theme.iconColor) : ''}
                <line x1="0" y1="${s(35)}" x2="${s(280)}" y2="${s(35)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.3"/>

                <text x="${s(15)}" y="${s(25)}" fill="${theme.titleColor}" font-size="${si(14)}" font-weight="600" letter-spacing="${s(1).toFixed(1)}">DEVELOPER RANK</text>

                <text x="${s(15)}" y="${s(85)}" fill="${theme.textColor}" font-size="${si(48)}" font-weight="700" filter="url(#glow)" class="number">${stats.rank.level}</text>
                <text x="${s(85)}" y="${s(60)}" fill="${theme.borderColor}" font-size="${si(11)}" font-weight="500">SCORE</text>
                <text x="${s(85)}" y="${s(85)}" fill="${theme.iconColor}" font-size="${si(24)}" font-weight="600" class="number" opacity="0.8">${stats.rank.score.toFixed(1)}</text>
                <text x="${s(15)}" y="${s(108)}" fill="${theme.borderColor}" font-size="${si(10)}">Based on contribution metrics</text>
            </g>
            ` : ''}

            <!-- Bottom left panel - Activity -->
            <g transform="translate(${s(40)}, ${height - s(160)})">
                <rect width="${s(280)}" height="${s(120)}" rx="${s(8)}" fill="url(#panelGradient)" stroke="${showDataBorderStroke ? theme.iconColor : 'none'}" stroke-width="${s(1).toFixed(1)}" opacity="0.8" />
                ${showDataBorderFrame ? this.renderFrameCorners(s(280), s(120), s(dataBorderFrameOffset), theme.iconColor) : ''}
                <line x1="0" y1="${s(35)}" x2="${s(280)}" y2="${s(35)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.3" />

                <text x="${s(15)}" y="${s(25)}" fill="${theme.titleColor}" font-size="${si(14)}" font-weight="600" letter-spacing="${s(1).toFixed(1)}">REPOSITORY ACTIVITY</text>

                <text x="${s(15)}" y="${s(60)}" fill="${theme.borderColor}" font-size="${si(10)}">Pull Requests</text>
                <text x="${s(200)}" y="${s(60)}" fill="${theme.textColor}" font-size="${si(16)}" font-weight="600" class="number" text-anchor="end">${CardRenderer.formatNumber(stats.totalPRs)}</text>
                <text x="${s(15)}" y="${s(82)}" fill="${theme.borderColor}" font-size="${si(10)}">Issues</text>
                <text x="${s(200)}" y="${s(82)}" fill="${theme.textColor}" font-size="${si(16)}" font-weight="600" class="number" text-anchor="end">${CardRenderer.formatNumber(stats.totalIssues)}</text>
                <text x="${s(15)}" y="${s(104)}" fill="${theme.borderColor}" font-size="${si(10)}">Contributed To</text>
                <text x="${s(200)}" y="${s(104)}" fill="${theme.iconColor}" font-size="${si(16)}" font-weight="600" class="number" text-anchor="end">${CardRenderer.formatNumber(stats.contributedTo)}</text>
            </g>

            <!-- Bottom right panel - Terminal style data stream -->
            <g transform="translate(${width - s(320)}, ${height - s(160)})">
                <rect width="${s(280)}" height="${s(120)}" rx="${s(8)}" fill="url(#panelGradient)" stroke="${showDataBorderStroke ? theme.iconColor : 'none'}" stroke-width="${s(1).toFixed(1)}" opacity="0.8" />
                ${showDataBorderFrame ? this.renderFrameCorners(s(280), s(120), s(dataBorderFrameOffset), theme.iconColor) : ''}
                <line x1="0" y1="${s(35)}" x2="${s(280)}" y2="${s(35)}" stroke="${theme.iconColor}" stroke-width="${s(1).toFixed(1)}" opacity="0.3" />

                <text x="${s(15)}" y="${s(25)}" fill="${theme.titleColor}" font-size="${si(14)}" font-weight="600" letter-spacing="${s(1).toFixed(1)}">DATA STREAM</text>
                <text x="${s(15)}" y="${s(55)}" fill="${theme.iconColor}" font-size="${si(9)}" opacity="0.8">> Analyzing contribution patterns...</text>
                <text x="${s(15)}" y="${s(72)}" fill="${theme.iconColor}" font-size="${si(9)}" opacity="0.7">> Processing ${stats.totalCommits} commits</text>
                <text x="${s(15)}" y="${s(89)}" fill="${theme.iconColor}" font-size="${si(9)}" opacity="0.6">> Stars collected: ${stats.totalStars}</text>
                <text x="${s(15)}" y="${s(106)}" fill="${theme.titleColor}" font-size="${si(9)}" opacity="0.5">> Status: ACTIVE_</text>
            </g>

            <!-- Corner accents -->
            <g stroke="${theme.iconColor}" stroke-width="${s(2).toFixed(1)}" fill="none" opacity="0.6">
                <path d="M ${s(20)} ${s(20)} L ${s(20)} ${s(50)} M ${s(20)} ${s(20)} L ${s(50)} ${s(20)}"/>
                <path d="M ${width - s(20)} ${s(20)} L ${width - s(20)} ${s(50)} M ${width - s(20)} ${s(20)} L ${width - s(50)} ${s(20)}"/>
                <path d="M ${s(20)} ${height - s(20)} L ${s(20)} ${height - s(50)} M ${s(20)} ${height - s(20)} L ${s(50)} ${height - s(20)}"/>
                <path d="M ${width - s(20)} ${height - s(20)} L ${width - s(20)} ${height - s(50)} M ${width - s(20)} ${height - s(20)} L ${width - s(50)} ${height - s(20)}"/>
            </g>
        </svg>
        `.trim();
    }

}
