/**
 * Request Validation Schemas
 * Provides runtime validation for API requests using Zod.
 *
 * These schemas define the contract at each route's boundary; when a request
 * fails to parse, `validate()` middleware calls `next(error)` and the shared
 * `errorHandler` maps ZodError → 400 with a formatted `details.fields` string.
 */

import { z } from 'zod';
import { isKnownTheme, isKnownBadgeTheme, normalizeThemeName } from '../utils/themes.js';

/**
 * Common validations
 */

// GitHub usernames: 1–39 chars, alphanumeric or hyphens (no leading/trailing/consecutive hyphens).
const githubUsername = z.string().min(1).max(39).regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, {
    message: 'Invalid GitHub username format'
});

// Accept #RGB / #RGBA / #RRGGBB / #RRGGBBAA (with or without leading '#') and
// normalize to `#…` form. Mirrors src/shared/utils/svg-safe.ts:normalizeHexColor
// so controllers and Zod agree on the same character set.
const HEX_RE = /^#?[0-9a-fA-F]{3,8}$/;
const colorHex = z.string()
    .refine(
        (v) => {
            if (!HEX_RE.test(v)) return false;
            const body = v.startsWith('#') ? v.slice(1) : v;
            return body.length === 3 || body.length === 4 || body.length === 6 || body.length === 8;
        },
        { message: 'Invalid hex color; expected #RGB, #RGBA, #RRGGBB, or #RRGGBBAA (with or without #)' },
    )
    .transform((v) => (v.startsWith('#') ? v : `#${v}`))
    .optional();

// Tightened theme name — only accept a value that resolves against the theme
// registry (case/underscore/space-insensitive, per resolveThemeName). The
// `.transform` canonicalises aliases (`Ocean` → `ocean`) so downstream code
// and cache keys never see two spellings of the same theme (M1).
const themeSchema = z.string()
    .refine(isKnownTheme, { message: 'Unknown theme' })
    .transform(normalizeThemeName)
    .optional();

// Badge endpoint accepts a CSV of themes; validate each item independently.
const badgeThemeCsvSchema = z.string()
    .refine(
        (v) => v.split(',').map((s) => s.trim()).filter(Boolean).every(isKnownBadgeTheme),
        { message: 'Unknown theme (CSV; one or more entries not registered)' },
    )
    .optional();

const booleanString = z.enum(['true', 'false']).optional();
const formatSchema = z.enum(['svg', 'webp', 'png']).optional();
const sizeSchema = z.enum(['small', 'medium', 'large', 'default']).optional();

// Integer-string clamped to a range. Used for badge `column` and `p` (padding).
const intStringRange = (min: number, max: number) =>
    z.string()
        .regex(/^\d+$/, 'Expected a non-negative integer')
        .transform(Number)
        .refine((n) => n >= min && n <= max, { message: `Expected an integer in [${min}, ${max}]` })
        .optional();

/**
 * Stats card request schema
 */
export const statsQuerySchema = z.object({
    username: githubUsername,
    theme: themeSchema,
    hide_title: booleanString,
    hide_border: booleanString,
    hide_rank: booleanString,
    show_icons: booleanString,
    avatar_mode: z.enum(['none', 'avatar', 'radar']).optional(),
    show_avatar: booleanString, // Backward compatibility
    custom_title: z.string().max(100).optional(),
    data_border_style: z.enum(['solid', 'frame']).optional(),
    data_border_frame: z.enum(['in', 'out']).optional(),
    bgColor: colorHex,
    borderColor: colorHex,
    textColor: colorHex,
    titleColor: colorHex,
    format: formatSchema,
    size: sizeSchema,
    year: z.string().regex(/^\d{4}$/, 'Expected a 4-digit year').optional(),
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;

/**
 * Languages card request schema
 */
export const languagesQuerySchema = z.object({
    username: githubUsername,
    type: z.enum(['card', 'pie']).optional(),
    theme: themeSchema,
    show_info: booleanString,
    info_outline: z.enum(['solid', 'frame']).optional(),
    size: sizeSchema,
});

export type LanguagesQuery = z.infer<typeof languagesQuerySchema>;

/**
 * Graph request schema — matches the controller's actual query surface
 * (see graphs.controller.ts:parseQueryParams).
 */
export const graphQuerySchema = z.object({
    username: githubUsername,
    theme: themeSchema,
    year: z.string().regex(/^\d{4}$/, 'Expected a 4-digit year').optional(),
    animate: z.enum(['none', 'wave', 'pulse', 'glow']).optional(),
    size: z.string().optional(),
    as: formatSchema,
    format: formatSchema,
    show_title: booleanString,
    show_total_contribution: booleanString,
    show_background: booleanString,
    bgColor: colorHex,
    borderColor: colorHex,
    textColor: colorHex,
    titleColor: colorHex,
});

export type GraphQuery = z.infer<typeof graphQuerySchema>;

/**
 * Badge request schema — mirrors badges.controller.ts:BadgeQueryParams.
 * CSV fields (`name`, `theme`) are validated as raw strings; the controller
 * splits and per-item validates against its own enum lists so we preserve the
 * discovery-payload behavior when `name` is absent.
 */
export const badgeQuerySchema = z.object({
    username: githubUsername,
    name: z.string().optional(),
    repo: z.string().max(200).optional(),
    theme: badgeThemeCsvSchema,
    effect: z.enum(['wave', 'glow']).optional(),
    column: intStringRange(1, 50),
    size: z.enum(['small', 'medium', 'large']).optional(),
    p: intStringRange(0, 100),
    customLabel: z.string().max(50).optional(),
    labelColor: colorHex,
    labelBackground: colorHex,
    iconColor: colorHex,
    valueColor: colorHex,
    valueBackground: colorHex,
    hideFrame: booleanString,
    realtime: booleanString,
});

export type BadgeQuery = z.infer<typeof badgeQuerySchema>;

/**
 * Validation helper functions
 */

/**
 * Convert boolean string to actual boolean
 */
export function parseBooleanString(value: string | undefined, defaultValue: boolean = false): boolean {
    if (value === undefined) return defaultValue;
    return value === 'true';
}

/**
 * Parse and validate number within range
 */
export function parseNumberInRange(value: string | undefined, min: number, max: number, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < min || parsed > max) {
        return defaultValue;
    }
    return parsed;
}

/**
 * Validate hex color (kept for callers that need a boolean check outside a
 * Zod pipeline; matches the schema above).
 */
export function isValidHexColor(color: string): boolean {
    if (!HEX_RE.test(color)) return false;
    const body = color.startsWith('#') ? color.slice(1) : color;
    return body.length === 3 || body.length === 4 || body.length === 6 || body.length === 8;
}

/**
 * Safe validation wrapper that returns validation result
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, errors: error };
        }
        throw error;
    }
}

/**
 * Format Zod validation errors for user-friendly display
 */
export function formatValidationErrors(error: z.ZodError): string {
    return error.issues
        .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
}
