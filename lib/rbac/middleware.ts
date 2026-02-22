// lib/rbac/middleware.ts
// RBAC middleware for checking user permissions

import { NextResponse } from 'next/server';
import { getTierPermissions, canAccessFeature, getUpgradeMessage, UserTier } from './permissions';

/**
 * Check if user has permission for a feature
 * Returns NextResponse with error if access denied, or null if allowed
 */
export async function checkFeatureAccess(
    tier: UserTier | null | undefined,
    feature: string
): Promise<NextResponse | null> {
    const hasAccess = canAccessFeature(tier, feature as any);

    if (!hasAccess) {
        return NextResponse.json(
            {
                error: 'Access denied',
                message: getUpgradeMessage(feature),
                tier: tier || 'free',
                requiresTier: 'pro',
            },
            { status: 403 }
        );
    }

    return null;
}

/**
 * Check if user has reached their usage limit
 */
export async function checkUsageLimit(
    tier: UserTier | null | undefined,
    currentUsage: number,
    limitType: 'aiAnalysisPerDay' | 'bulkImportMaxTrades'
): Promise<NextResponse | null> {
    const permissions = getTierPermissions(tier);
    const limit = permissions[limitType];

    if (typeof limit === 'number' && currentUsage >= limit) {
        return NextResponse.json(
            {
                error: 'Limit reached',
                message: `You have reached your ${limitType} limit of ${limit}. ${getUpgradeMessage(limitType)}`,
                currentUsage,
                limit,
                tier: tier || 'free',
            },
            { status: 429 }
        );
    }

    return null;
}

/**
 * Get user tier from database
 * This should be called with the user's data from Supabase
 */
export function getUserTier(userData: any): UserTier {
    // Check if user data has tier field
    if (userData?.tier) {
        return userData.tier as UserTier;
    }

    // Check if user data has role field (fallback)
    if (userData?.role) {
        return userData.role as UserTier;
    }

    // Default to free tier
    return 'free';
}
