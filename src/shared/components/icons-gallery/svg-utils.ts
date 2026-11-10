/**
 * SVG rendering utilities
 */

function createSVGElement(attributes: Record<string, string>, children?: (SVGElement | Element)[]): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    Object.entries(attributes).forEach(([key, value]) => {
        svg.setAttribute(key, value);
    });

    if (children) {
        children.forEach(child => svg.appendChild(child));
    }

    return svg;
}

function createSVGPath(attributes: Record<string, string>): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    Object.entries(attributes).forEach(([key, value]) => {
        path.setAttribute(key, value);
    });
    return path;
}

export function createCopySVG(): SVGElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '14');
    rect.setAttribute('height', '14');
    rect.setAttribute('x', '8');
    rect.setAttribute('y', '8');
    rect.setAttribute('rx', '2');
    rect.setAttribute('ry', '2');

    const path = createSVGPath({ d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' });

    return createSVGElement({
        width: '16',
        height: '16',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        class: 'lucide lucide-copy',
    }, [rect, path]);
}

export function createCheckSVG(): SVGElement {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '20 6 9 17 4 12');

    return createSVGElement({
        width: '16',
        height: '16',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
    }, [polyline]);
}

export async function fetchSVGContent(path: string): Promise<string> {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching SVG from ${path}:`, error);
        throw error;
    }
}
