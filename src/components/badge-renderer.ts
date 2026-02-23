import { getTheme, getBadgeTheme } from '../utils/themes.js';

export class BadgeRenderer {
    static generateBadge(username: string, count: number, themeName: string = 'default', customColors?: {
        labelColor?: string;
        labelBackground?: string;
        valueColor?: string;
        valueBackground?: string;
    }): string {
        const theme = getTheme(themeName);
        const badgeTheme = getBadgeTheme(themeName);

        const finalLabelColor = customColors?.labelColor || badgeTheme.labelColor;
        const finalLabelBg = customColors?.labelBackground || badgeTheme.labelBackground;
        const finalValueColor = customColors?.valueColor || badgeTheme.valueColor;
        const finalValueBg = customColors?.valueBackground || badgeTheme.valueBackground;

        const fontName = theme.fontName || 'Orbitron';
        const fontFamily = theme.fontFamily || `'${fontName}', 'Ubuntu', 'sans-serif'`;

        // Formatted count
        const formattedCount = count.toLocaleString();

        // Calculate widths based on text length (estimations)
        const labelText = "VISITORS";
        const labelWidth = labelText.length * 8 + 20;
        const countWidth = formattedCount.length * 10 + 20;
        const totalWidth = labelWidth + countWidth;
        const height = 28;

        return `
        <svg width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <style>
                @font-face {
                    font-family: '${fontName}';
                    font-style: normal;
                    font-weight: 400 900;
                    font-display: swap;
                    src: url(/fonts/orbitron.woff2) format('woff2');
                }
                text {
                    font-family: ${fontFamily};
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .label-text {
                    fill: ${finalLabelColor};
                    font-size: 11px;
                }
                .count-text {
                    fill: ${finalValueColor};
                    font-size: 14px;
                }
            </style>

            <!-- Background -->
            <rect width="${totalWidth}" height="${height}" rx="4" fill="${finalValueBg}" stroke="${theme.borderColor}" stroke-width="1" />
            
            <!-- Label Section -->
            <path d="M 4 1 H ${labelWidth} V ${height - 1} H 4 Q 1 ${height - 1} 1 ${height - 4} V 4 Q 1 1 4 1 Z" fill="${finalLabelBg}" />
            <text x="${labelWidth / 2}" y="${height / 2 + 4}" text-anchor="middle" class="label-text">${labelText}</text>
            
            <!-- Count Section -->
            <text x="${labelWidth + (countWidth / 2)}" y="${height / 2 + 5}" text-anchor="middle" class="count-text" filter="url(#glow)">${formattedCount}</text>
            
            <!-- Accent Line -->
            <line x1="${labelWidth}" y1="6" x2="${labelWidth}" y2="${height - 6}" stroke="${theme.borderColor}" stroke-width="1" opacity="0.3" />
        </svg>
        `.trim();
    }
}
