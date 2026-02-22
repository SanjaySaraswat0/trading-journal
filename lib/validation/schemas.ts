// lib/validation/schemas.ts
// Comprehensive Zod validation schemas for all API inputs

import { z } from 'zod';

// ==========================================
// TRADE SCHEMAS
// ==========================================

export const tradeTypeSchema = z.enum(['long', 'short']);
export const assetTypeSchema = z.enum(['stock', 'forex', 'crypto', 'option', 'futures']);
export const statusSchema = z.enum(['open', 'win', 'loss', 'breakeven']);
export const timeframeSchema = z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']);

export const createTradeSchema = z.object({
    symbol: z.string()
        .min(1, 'Symbol is required')
        .max(20, 'Symbol too long')
        .regex(/^[A-Z0-9]+$/, 'Symbol must be uppercase alphanumeric'),

    trade_type: tradeTypeSchema,

    asset_type: assetTypeSchema.optional().default('stock'),

    entry_price: z.number()
        .positive('Entry price must be positive')
        .finite('Entry price must be a valid number'),

    exit_price: z.number()
        .positive('Exit price must be positive')
        .finite('Exit price must be a valid number')
        .nullable()
        .optional(),

    stop_loss: z.number()
        .positive('Stop loss must be positive')
        .finite('Stop loss must be a valid number')
        .nullable()
        .optional(),

    target_price: z.number()
        .positive('Target price must be positive')
        .finite('Target price must be a valid number')
        .nullable()
        .optional(),

    quantity: z.number()
        .positive('Quantity must be positive')
        .int('Quantity must be an integer'),

    entry_time: z.string()
        .datetime({ message: 'Invalid entry time format' })
        .optional(),

    exit_time: z.string()
        .datetime({ message: 'Invalid exit time format' })
        .nullable()
        .optional(),

    timeframe: timeframeSchema.nullable().optional(),

    setup_type: z.string()
        .max(50, 'Setup type too long')
        .nullable()
        .optional(),

    reason: z.string()
        .max(500, 'Reason too long')
        .nullable()
        .optional(),

    emotions: z.array(z.string().max(30))
        .max(10, 'Too many emotions')
        .nullable()
        .optional(),

    tags: z.array(z.string().max(30))
        .max(20, 'Too many tags')
        .nullable()
        .optional(),

    screenshot_url: z.string()
        .url('Invalid screenshot URL')
        .nullable()
        .optional(),
});

export const updateTradeSchema = createTradeSchema.partial().extend({
    id: z.string().uuid('Invalid trade ID'),
});

export const tradeIdSchema = z.object({
    id: z.string().uuid('Invalid trade ID'),
});

// ==========================================
// USER/AUTH SCHEMAS
// ==========================================

export const emailSchema = z.string()
    .email('Invalid email address')
    .max(255, 'Email too long');

export const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const signupSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .optional(),
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

// ==========================================
// CSV/EXCEL IMPORT SCHEMAS
// ==========================================

export const csvTradeSchema = z.object({
    symbol: z.string().min(1),
    trade_type: tradeTypeSchema,
    entry_price: z.number().positive(),
    exit_price: z.number().positive().optional(),
    stop_loss: z.number().positive().optional(),
    target_price: z.number().positive().optional(),
    quantity: z.number().positive().int(),
    entry_time: z.string().optional(),
    exit_time: z.string().optional(),
    setup_type: z.string().optional(),
    reason: z.string().optional(),
});

export const bulkImportSchema = z.object({
    trades: z.array(csvTradeSchema)
        .min(1, 'At least one trade required')
        .max(500, 'Too many trades in one import'),
});

// ==========================================
// AI ANALYSIS SCHEMAS
// ==========================================

export const analyzeTradeSchema = z.object({
    tradeId: z.string().uuid('Invalid trade ID'),
});

export const analyzePatternsSchema = z.object({
    limit: z.number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(50),

    days: z.number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .default(30),
});

export const weeklyReportSchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});

// ==========================================
// PSYCHOLOGY TRACKING SCHEMAS
// ==========================================

export const psychologyEntrySchema = z.object({
    mood: z.enum(['excellent', 'good', 'neutral', 'bad', 'terrible']),
    confidence: z.number().int().min(1).max(10),
    sleep_quality: z.enum(['excellent', 'good', 'fair', 'poor']),
    stress_level: z.number().int().min(1).max(10),
    notes: z.string().max(500).optional(),
    timestamp: z.string().datetime().optional(),
});

// ==========================================
// QUERY PARAMETER SCHEMAS
// ==========================================

export const paginationSchema = z.object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
});

export const dateRangeSchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});

// ==========================================
// HELPER TYPE EXPORTS
// ==========================================

export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;
export type AnalyzePatternsInput = z.infer<typeof analyzePatternsSchema>;
export type PsychologyEntryInput = z.infer<typeof psychologyEntrySchema>;
