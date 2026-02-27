/**
 * Request Validation Schemas
 * Provides runtime validation for API requests using Zod
 */

import { z } from 'zod';

/**
 * Common validations
 */
const githubUsername = z.string().min(1).max(39).regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, {
    message: 'Invalid GitHub username format'
});

const themeSchema = z.string().optional();
const booleanString = z.enum(['true', 'false']).optional();
const colorHex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional();
const formatSchema = z.enum(['svg', 'webp', 'png']).optional();

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
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;

/**
 * Languages card request schema
 */
export const languagesQuerySchema = z.object({
    username: githubUsername,
    theme: themeSchema,
    show_info: booleanString,
    list_length: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(20)).optional(),
    variant: z.enum(['bubbles', 'pie']).optional(),
    data_border_style: z.enum(['solid', 'frame']).optional(),
    bgColor: colorHex,
    borderColor: colorHex,
    textColor: colorHex,
    titleColor: colorHex,
});

export type LanguagesQuery = z.infer<typeof languagesQuerySchema>;

/**
 * Graph request schema
 */
export const graphQuerySchema = z.object({
    username: githubUsername,
    theme: themeSchema,
    variant: z.enum(['default', 'heatmap', 'bar']).optional(),
    year: z.string().regex(/^\d{4}$/).transform(Number).pipe(z.number().min(2008).max(new Date().getFullYear())).optional(),
    bgColor: colorHex,
    borderColor: colorHex,
    textColor: colorHex,
    iconColor: colorHex,
    hideTitle: booleanString,
});

export type GraphQuery = z.infer<typeof graphQuerySchema>;

/**
 * Badge request schema
 */
export const badgeQuerySchema = z.object({
    username: githubUsername,
    theme: themeSchema,
    customLabel: z.string().max(50).optional(),
    labelColor: colorHex,
    labelBackground: colorHex,
    valueColor: colorHex,
    valueBackground: colorHex,
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
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
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
