// lib/rbac/permissions.ts
// Role-Based Access Control (RBAC) permissions and tier system

export const USER_ROLES = {
    FREE: 'free',
    PRO: 'pro',
    ADMIN: 'admin',
} as const;

export const USER_TIERS = {
    FREE: 'free',
    PRO: 'pro',
    ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type UserTier = typeof USER_TIERS[keyof typeof USER_TIERS];

// ==========================================
// TIER PERMISSIONS CONFIGURATION
// ==========================================

export interface TierLimits {
    // AI Analysis Limits
    aiAnalysisPerDay: number;
    aiWeeklyReports: boolean;
    aiAdvancedPatterns: boolean;
    aiCustomPrompts: boolean;

    // Trade Management Limits
    bulkImportMaxTrades: number;
    unlimitedBulkImport: boolean;

    // Data Access Limits
    tradeHistoryDays: number | null; // null = unlimited

    // Feature Access
    advancedAnalytics: boolean;
    exportPDF: boolean;
    customTags: boolean;
}

export const TIER_PERMISSIONS: Record<UserTier, TierLimits> = {
    [USER_TIERS.FREE]: {
        // AI Analysis
        aiAnalysisPerDay: 10,
        aiWeeklyReports: false,
        aiAdvancedPatterns: false,
        aiCustomPrompts: false,

        // Trade Management
        bulkImportMaxTrades: 50,
        unlimitedBulkImport: false,

        // Data Access
        tradeHistoryDays: 90, // 90 days only

        // Features
        advancedAnalytics: false,
        exportPDF: false,
        customTags: false,
    },

    [USER_TIERS.PRO]: {
        // AI Analysis
        aiAnalysisPerDay: 1000, // Effectively unlimited
        aiWeeklyReports: true,
        aiAdvancedPatterns: true,
        aiCustomPrompts: true,

        // Trade Management
        bulkImportMaxTrades: 999999, // Unlimited
        unlimitedBulkImport: true,

        // Data Access
        tradeHistoryDays: null, // Unlimited

        // Features
        advancedAnalytics: true,
        exportPDF: true,
        customTags: true,
    },

    [USER_TIERS.ADMIN]: {
        // Full access to everything
        aiAnalysisPerDay: 999999,
        aiWeeklyReports: true,
        aiAdvancedPatterns: true,
        aiCustomPrompts: true,
        bulkImportMaxTrades: 999999,
        unlimitedBulkImport: true,
        tradeHistoryDays: null,
        advancedAnalytics: true,
        exportPDF: true,
        customTags: true,
    },
};

// ==========================================
// PERMISSION HELPER FUNCTIONS
// ==========================================

/**
 * Get tier permissions for a user
 */
export function getTierPermissions(tier: UserTier | null | undefined): TierLimits {
    const userTier = tier || USER_TIERS.FREE;
    return TIER_PERMISSIONS[userTier] || TIER_PERMISSIONS[USER_TIERS.FREE];
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(
    tier: UserTier | null | undefined,
    feature: keyof TierLimits
): boolean {
    const permissions = getTierPermissions(tier);
    const value = permissions[feature];

    // For boolean features
    if (typeof value === 'boolean') {
        return value;
    }

    // For numeric limits (consider as accessible if > 0)
    if (typeof value === 'number') {
        return value > 0;
    }

    // For null values (unlimited access)
    if (value === null) {
        return true;
    }

    return false;
}

/**
 * Check if user has reached their limit for a feature
 */
export function hasReachedLimit(
    tier: UserTier | null | undefined,
    feature: keyof TierLimits,
    currentUsage: number
): boolean {
    const permissions = getTierPermissions(tier);
    const limit = permissions[feature];

    // If limit is null (unlimited), never reached
    if (limit === null) {
        return false;
    }

    // If limit is boolean, check if feature is enabled
    if (typeof limit === 'boolean') {
        return !limit;
    }

    // If limit is number, check if current usage exceeds it
    if (typeof limit === 'number') {
        return currentUsage >= limit;
    }

    return true;
}

/**
 * Get upgrade message for feature
 */
export function getUpgradeMessage(feature: string): string {
    const messages: Record<string, string> = {
        aiWeeklyReports: 'Upgrade to Pro to unlock AI Weekly Reports',
        aiAdvancedPatterns: 'Upgrade to Pro for Advanced Pattern Detection',
        aiCustomPrompts: 'Upgrade to Pro to use Custom AI Prompts',
        bulkImportMaxTrades: 'Upgrade to Pro for unlimited bulk imports',
        advancedAnalytics: 'Upgrade to Pro for Advanced Analytics',
        exportPDF: 'Upgrade to Pro to export PDF reports',
    };

    return messages[feature] || 'Upgrade to Pro to unlock this feature';
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
    return role === USER_ROLES.ADMIN;
}

/**
 * Check if user is pro or admin
 */
export function isProOrAdmin(tier: UserTier | null | undefined): boolean {
    return tier === USER_TIERS.PRO || tier === USER_TIERS.ADMIN;
}
