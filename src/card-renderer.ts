import { GitHubStats, CardOptions } from './types.js';
import { getTheme } from './themes.js';



export class CardRenderer {
    static generateStatsCard(stats: GitHubStats, options: CardOptions): string {
        const theme = getTheme(options.theme);
        const showIcons = options.showIcons !== false;
        const hideBorder = options.hideBorder || false;
        const hideTitle = options.hideTitle || false;
        const hideRank = options.hideRank || false;
        const customTitle = options.customTitle || `${stats.name}'s GitHub Stats`;

        const width = 1200;
        const height = 600;
        const centerX = width / 2;
        const centerY = height / 2;

        // Helper function to format large numbers
        function formatNumber(num: number): string {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        }

        // Generate starfield (static to reduce size)
        const stars = Array.from({ length: 30 }, (_, i) => {
            const x = (Math.random() * width).toFixed(0);
            const y = (Math.random() * height).toFixed(0);
            const r = (Math.random() * 1.5 + 0.5).toFixed(1);
            const opacity = (Math.random() * 0.7 + 0.3).toFixed(1);
            return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${opacity}"/>`;
        }).join('');

        // Removed shooting stars to reduce size
        const shootingStars = '';

        // Generate orbital rings
        const orbitRings = [120, 180, 240].map((r, i) =>
            `<circle cx="${centerX}" cy="${centerY}" r="${r}" fill="none" stroke="rgba(0,200,255,${(0.15 - i * 0.03).toFixed(2)})" stroke-width="1" stroke-dasharray="10,8"/>`
        ).join('');

        // Generate data beams radiating from center
        const statValues = [
            { value: stats.totalStars, label: 'Stars', angle: 0 },
            { value: stats.totalCommits, label: 'Commits', angle: 72 },
            { value: stats.totalPRs, label: 'PRs', angle: 144 },
            { value: stats.totalIssues, label: 'Issues', angle: 216 },
            { value: stats.contributedTo, label: 'Contributed', angle: 288 }
        ];
        const maxValue = Math.max(...statValues.map(s => s.value));

        // Generate radial beams and data points
        const dataBeams = statValues.map((stat, i) => {
            const angle = (stat.angle * Math.PI) / 180;
            const intensity = maxValue > 0 ? stat.value / maxValue : 0;
            const beamLength = 100 + (intensity * 140);
            const endX = (centerX + Math.cos(angle) * beamLength).toFixed(1);
            const endY = (centerY + Math.sin(angle) * beamLength).toFixed(1);

            // Data point position
            const dotX = (centerX + Math.cos(angle) * (beamLength + 20)).toFixed(1);
            const dotY = (centerY + Math.sin(angle) * (beamLength + 20)).toFixed(1);

            // Label position (further out)
            const labelX = (centerX + Math.cos(angle) * (beamLength + 60)).toFixed(1);
            const labelY = (centerY + Math.sin(angle) * (beamLength + 60)).toFixed(1);
            const labelYTop = (Number(labelY) - 12).toFixed(1);
            const labelYBottom = (Number(labelY) + 6).toFixed(1);

            return `<line x1="${centerX}" y1="${centerY}" x2="${endX}" y2="${endY}" stroke="url(#beamGradient${i})" stroke-width="2" opacity="0.6"/><circle cx="${dotX}" cy="${dotY}" r="6" fill="#00c8ff" filter="url(#glow)"/><text x="${labelX}" y="${labelYTop}" text-anchor="middle" fill="#00c8ff" font-size="11" font-weight="600">${stat.label}</text><text x="${labelX}" y="${labelYBottom}" text-anchor="middle" fill="#fff" font-size="20" font-weight="700" class="number">${formatNumber(stat.value)}</text>`;
        }).join('');

        // Corner info panels
        const totalContributions = stats.totalStars + stats.totalCommits + stats.totalPRs + stats.totalIssues;

        return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Radial gradient for background -->
                <radialGradient id="spaceGradient" cx="50%" cy="50%">
                    <stop offset="0%" style="stop-color:#0a0e27;stop-opacity:1" />
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
                ${statValues.map((_, i) => `
                <linearGradient id="beamGradient${i}" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#00c8ff;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:#00c8ff;stop-opacity:0.8" />
                </linearGradient>
                `).join('')}

                <!-- Circular gradient for center sphere -->
                <radialGradient id="sphereGradient" cx="40%" cy="40%">
                    <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:0.8" />
                    <stop offset="50%" style="stop-color:#0088cc;stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:#004466;stop-opacity:0.9" />
                </radialGradient>

                <!-- Panel gradient -->
                <linearGradient id="panelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:rgba(0, 200, 255, 0.1);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:rgba(0, 100, 200, 0.05);stop-opacity:1" />
                </linearGradient>

                <!-- Scan line pattern -->
                <pattern id="scanlines" x="0" y="0" width="100%" height="4" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(0, 200, 255, 0.05)" stroke-width="1"/>
                </pattern>

                <!-- Shooting star gradient -->
                <linearGradient id="shootingStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#00c8ff;stop-opacity:0" />
                    <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
                </linearGradient>

                <!-- Circular mask for avatar -->
                <clipPath id="avatarClip">
                    <circle cx="${centerX}" cy="${centerY}" r="65"/>
                </clipPath>
            </defs>

            <style>
                @font-face {
                    font-family: 'Orbitron';
                    font-style: normal;
                    font-weight: 400 900;
                    font-display: swap;
                    src: url(fonts/orbitron.woff2) format('woff2');
                    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
                }

                text {
                    font-family: 'Orbitron', 'Ubuntu', 'sans-serif';
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
            </style>

            <!-- Space background -->
            <rect width="${width}" height="${height}" fill="url(#spaceGradient)" />

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
                    const x = (i + 1) * (width / 12);
                    return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#00c8ff" stroke-width="0.5"/>`;
                }).join('')}
                ${Array.from({ length: 6 }, (_, i) => {
                    const y = (i + 1) * (height / 6);
                    return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#00c8ff" stroke-width="0.5"/>`;
                }).join('')}
            </g>

            <!-- Data beams -->
            <g class="fade-in">
                ${dataBeams}
            </g>

            <!-- Center sphere (Earth-like) -->
            <g filter="url(#strongGlow)">
                <!-- Avatar image -->
                <image href="${stats.avatarUrl}" x="${centerX - 65}" y="${centerY - 65}" width="130" height="130" clip-path="url(#avatarClip)" opacity="0.9" />

                <!-- Avatar border and effects -->
                <circle cx="${centerX}" cy="${centerY}" r="65" fill="none" stroke="#00c8ff" stroke-width="3" opacity="0.8" />
                <circle cx="${centerX}" cy="${centerY}" r="70" fill="none" stroke="#00c8ff" stroke-width="1" opacity="0.5" />
                <circle cx="${centerX}" cy="${centerY}" r="80" fill="none" stroke="#00c8ff" stroke-width="2" opacity="0.3" />
                <circle cx="${centerX}" cy="${centerY}" r="75" fill="none" stroke="#00c8ff" stroke-width="1" opacity="0.4" stroke-dasharray="4,4" />

                <!-- Ping animation rings -->
                <circle cx="${centerX}" cy="${centerY}" r="80" fill="none" stroke="#00c8ff54" stroke-width="2" opacity="0"><animate attributeName="r" values="80;150;220" dur="5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0.3;0" dur="5s" repeatCount="indefinite"/></circle>
            </g>

            <!-- Top left panel - User info -->
            ${!hideTitle ? `
            <g transform="translate(40, 40)">
                <rect width="280" height="120" rx="8" fill="url(#panelGradient)" stroke="#00c8ff" stroke-width="1" opacity="0.8" />
                <line x1="0" y1="35" x2="280" y2="35" stroke="#00c8ff" stroke-width="1" opacity="0.3" />

                <text x="15" y="25" fill="#00c8ff" font-size="14" font-weight="600" letter-spacing="1">${customTitle}</text>
                <text x="15" y="55" fill="#888" font-size="11" font-weight="500">TOTAL CONTRIBUTIONS</text>
                <text x="15" y="85" fill="#fff" font-size="32" font-weight="700"  class="number" filter="url(#glow)">${formatNumber(totalContributions)}</text>
                <text x="15" y="108" fill="#00c8ff" font-size="10" opacity="0.7">Last synchronized: ${new Date().toLocaleTimeString()}</text>
            </g>
            ` : ''}

            <!-- Top right panel - Rank -->
            ${!hideRank && stats.rank ? `
            <g transform="translate(${width - 320}, 40)">
                <rect width="280" height="120" rx="8" fill="url(#panelGradient)" stroke="#00c8ff" stroke-width="1" opacity="0.8"/>
                <line x1="0" y1="35" x2="280" y2="35" stroke="#00c8ff" stroke-width="1" opacity="0.3"/>

                <text x="15" y="25" fill="#00c8ff" font-size="14" font-weight="600" letter-spacing="1">DEVELOPER RANK</text>

                <text x="15" y="85" fill="#fff" font-size="48" font-weight="700" filter="url(#glow)" class="number">${stats.rank.level}</text>
                <text x="85" y="60" fill="#888" font-size="11" font-weight="500">SCORE</text>
                <text x="85" y="85" fill="#00c8ff" font-size="24" font-weight="600" class="number" opacity="0.8">${stats.rank.score.toFixed(1)}</text>
                <text x="15" y="108" fill="#888" font-size="10">Based on contribution metrics</text>
            </g>
            ` : ''}

            <!-- Bottom left panel - Activity -->
            <g transform="translate(40, ${height - 160})">
                <rect width="280" height="120" rx="8" fill="url(#panelGradient)" stroke="#00c8ff" stroke-width="1" opacity="0.8" />
                <line x1="0" y1="35" x2="280" y2="35" stroke="#00c8ff" stroke-width="1" opacity="0.3" />

                <text x="15" y="25" fill="#00c8ff" font-size="14" font-weight="600" letter-spacing="1">REPOSITORY ACTIVITY</text>

                <text x="15" y="60" fill="#888" font-size="10">Pull Requests</text>
                <text x="200" y="60" fill="#fff" font-size="16" font-weight="600" class="number" text-anchor="end">${formatNumber(stats.totalPRs)}</text>
                <text x="15" y="82" fill="#888" font-size="10">Issues</text>
                <text x="200" y="82" fill="#fff" font-size="16" font-weight="600" class="number" text-anchor="end">${formatNumber(stats.totalIssues)}</text>
                <text x="15" y="104" fill="#888" font-size="10">Contributed To</text>
                <text x="200" y="104" fill="#00c8ff" font-size="16" font-weight="600" class="number" text-anchor="end">${formatNumber(stats.contributedTo)}</text>
            </g>

            <!-- Bottom right panel - Terminal style data stream -->
            <g transform="translate(${width - 320}, ${height - 160})">
                <rect width="280" height="120" rx="8" fill="url(#panelGradient)" stroke="#00c8ff" stroke-width="1" opacity="0.8" />
                <line x1="0" y1="35" x2="280" y2="35" stroke="#00c8ff" stroke-width="1" opacity="0.3" />

                <text x="15" y="25" fill="#00c8ff" font-size="14" font-weight="600" letter-spacing="1">DATA STREAM</text>
                <text x="15" y="55" fill="#0f0" font-size="9" opacity="0.8">> Analyzing contribution patterns...</text>
                <text x="15" y="72" fill="#0f0" font-size="9" opacity="0.7">> Processing ${stats.totalCommits} commits</text>
                <text x="15" y="89" fill="#0f0" font-size="9" opacity="0.6">> Stars collected: ${stats.totalStars}</text>
                <text x="15" y="106" fill="#00c8ff" font-size="9" opacity="0.5">> Status: ACTIVE_</text>
            </g>

            <!-- Corner accents -->
            <g stroke="#00c8ff" stroke-width="2" fill="none" opacity="0.6">
                <path d="M 20 20 L 20 50 M 20 20 L 50 20"/>
                <path d="M ${width - 20} 20 L ${width - 20} 50 M ${width - 20} 20 L ${width - 50} 20"/>
                <path d="M 20 ${height - 20} L 20 ${height - 50} M 20 ${height - 20} L 50 ${height - 20}"/>
                <path d="M ${width - 20} ${height - 20} L ${width - 20} ${height - 50} M ${width - 20} ${height - 20} L ${width - 50} ${height - 20}"/>
            </g>
        </svg>
        `.trim();
    }
}
