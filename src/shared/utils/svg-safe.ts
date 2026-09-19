/**
 * SVG-injection defences shared by badge/card/graph renderers.
 *
 * Two independent hardening steps:
 *   1. `svgEscape` — escapes text/attribute interpolations before they hit SVG output.
 *   2. `normalizeHexColor` — validates a user-supplied color at the controller
 *      boundary. Only pure hex is accepted; anything else (named colors, rgb(),
 *      CSS expressions) is rejected so it can never reach a `fill="…"` attribute.
 */

const HEX_COLOR = /^#?[0-9a-fA-F]{3,8}$/;

/**
 * Escape the five XML characters that can break out of a text node or attribute
 * value. Escapes `& < > " '` so an interpolated value like
 * `</text><script>…</script>` becomes inert text.
 */
export function svgEscape(value: string): string {
    return value.replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default:  return ch;
        }
    });
}

/**
 * Accept `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` or the same without leading
 * `#`. Returns the canonical `#…` form, or `null` if invalid.
 */
export function normalizeHexColor(value: string): string | null {
    if (!HEX_COLOR.test(value)) return null;
    const hex = value.startsWith('#') ? value.slice(1) : value;
    if (hex.length !== 3 && hex.length !== 4 && hex.length !== 6 && hex.length !== 8) {
        return null;
    }
    return `#${hex}`;
}
