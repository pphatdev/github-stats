import { BadgeTheme } from "../../types/badge.types.js";

export const badgeThemes: { [key: string]: BadgeTheme } = {
    default: {
        labelColor: "#c0a3fb",
        labelBackground: "#333333",
        valueColor: "#ffffff",
        valueBackground: "#4c1a8a"
    },
    aurora: {
        labelColor: '#c8ffd4',
        labelBackground: '#0a3026',
        valueColor: '#ffffff',
        valueBackground: '#00e676',
    },
    matrix: {
        labelColor: '#39ff14',
        labelBackground: '#003300',
        valueColor: '#ffffff',
        valueBackground: '#00cc33',
    },
    inferno: {
        labelColor: '#ffcf77',
        labelBackground: '#3d0a00',
        valueColor: '#ffffff',
        valueBackground: '#ff4500',
    },
    ocean: {
        labelColor: '#b2f0ff',
        labelBackground: '#0a2a40',
        valueColor: '#ffffff',
        valueBackground: '#0099cc',
    },
    neon: {
        labelColor: '#ff99ee',
        labelBackground: '#3d0050',
        valueColor: '#ffffff',
        valueBackground: '#cc00ff',
    },
    solar: {
        labelColor: '#ffe88a',
        labelBackground: '#3a2800',
        valueColor: '#0d0900',
        valueBackground: '#f5a623',
    },
    galaxy: {
        labelColor: '#e9d5ff',
        labelBackground: '#1e0a40',
        valueColor: '#ffffff',
        valueBackground: '#8b5cf6',
    },
    'github-dark': {
        labelColor: '#8ad095',
        labelBackground: '#21262d',
        valueColor: '#ffffff',
        valueBackground: '#39d353',
    },
};
