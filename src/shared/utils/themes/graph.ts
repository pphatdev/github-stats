import { Theme } from "../../types/themes.type.js";

/**
 * Graph-optimized themes for the /graph activity heatmap.
 *
 * These themes are tuned so that `iconColor` (the heatmap cell fill) is vivid
 * and high-contrast against the near-black `bgColor`, making contribution
 * density immediately readable.
 *
 * Key colour roles in the graph:
 *   titleColor  → large heading text (username + year)
 *   textColor   → subtitle, month labels, legend labels
 *   iconColor   → heatmap cell fill (levels 1-4 derived from this)
 *   bgColor     → canvas background (should be very dark)
 *   borderColor → background grid lines and divider
 */
export const graphThemes: { [key: string]: Theme } = {
    /** Emerald green — Northern Lights feel */
    aurora: {
        titleColor: '#a8ffce',
        textColor: '#c8ffd4',
        iconColor: '#00e676',
        bgColor: '#020c12',
        borderColor: '#0a3026',
    },

    /** Pure terminal green on black — classic hacker aesthetic */
    matrix: {
        titleColor: '#00ff41',
        textColor: '#39ff14',
        iconColor: '#00cc33',
        bgColor: '#000000',
        borderColor: '#003300',
    },

    /** Red-orange fire gradient — heat/intensity */
    inferno: {
        titleColor: '#ff9a00',
        textColor: '#ffcf77',
        iconColor: '#ff4500',
        bgColor: '#0d0200',
        borderColor: '#3d0a00',
    },

    /** Deep cyan-blue water — calm and readable */
    ocean: {
        titleColor: '#00d4ff',
        textColor: '#b2f0ff',
        iconColor: '#0099cc',
        bgColor: '#020d1a',
        borderColor: '#0a2a40',
    },

    /** Magenta / purple — cyberpunk neon */
    neon: {
        titleColor: '#ff00cc',
        textColor: '#ff99ee',
        iconColor: '#cc00ff',
        bgColor: '#0a000f',
        borderColor: '#3d0050',
    },

    /** Amber / gold — warm solar glow */
    solar: {
        titleColor: '#ffd700',
        textColor: '#ffe88a',
        iconColor: '#f5a623',
        bgColor: '#0d0900',
        borderColor: '#3a2800',
    },

    /** Violet / purple — deep-space galaxy */
    galaxy: {
        titleColor: '#c084fc',
        textColor: '#e9d5ff',
        iconColor: '#8b5cf6',
        bgColor: '#05020f',
        borderColor: '#1e0a40',
    },

    /** GitHub native dark palette — green contribution cells */
    'github-dark': {
        titleColor: '#58a6ff',
        textColor: '#c9d1d9',
        iconColor: '#39d353',
        bgColor: '#0d1117',
        borderColor: '#21262d',
    },
};
