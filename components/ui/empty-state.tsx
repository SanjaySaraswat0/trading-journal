'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
    variant?: 'default' | 'info' | 'warning';
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    variant = 'default'
}: EmptyStateProps) {
    const variantStyles = {
        default: 'from-blue-500/10 to-purple-500/10 border-blue-300',
        info: 'from-cyan-500/10 to-blue-500/10 border-cyan-300',
        warning: 'from-yellow-500/10 to-orange-500/10 border-yellow-300',
    };

    const iconStyles = {
        default: 'bg-gradient-blue',
        info: 'bg-gradient-purple',
        warning: 'bg-gradient-orange',
    };

    return (
        <div className={`glass-card bg-gradient-to-br ${variantStyles[variant]} border-2 text-center py-12`}>
            <div className="max-w-md mx-auto">
                <div className={`${iconStyles[variant]} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {title}
                </h3>

                <p className="text-gray-600 mb-6">
                    {description}
                </p>

                {action && (
                    <div className="flex justify-center">
                        {action}
                    </div>
                )}
            </div>
        </div>
    );
}

// Convenience components for common use cases
export function NoTradesEmpty() {
    return (
        <EmptyState
            icon={require('lucide-react').TrendingUp}
            title="No trades yet"
            description="Start your trading journey by recording your first trade. Track your performance and get AI-powered insights."
            action={
                <Link
                    href="/trades/new"
                    className="bg-gradient-green text-white px-6 py-3 rounded-lg hover:opacity-90 transition-smooth font-medium inline-flex items-center gap-2"
                >
                    Add Your First Trade
                </Link>
            }
        />
    );
}

export function NoAIInsightsEmpty() {
    return (
        <EmptyState
            icon={require('lucide-react').Brain}
            title="Not enough data for AI insights"
            description="Add at least 10 trades to unlock personalized AI coaching, pattern detection, and predictive analytics."
            action={
                <Link
                    href="/trades/new"
                    className="bg-gradient-purple text-white px-6 py-3 rounded-lg hover:opacity-90 transition-smooth font-medium inline-flex items-center gap-2"
                >
                    Add More Trades
                </Link>
            }
            variant="info"
        />
    );
}

export function NoResultsEmpty({ onReset }: { onReset?: () => void }) {
    return (
        <EmptyState
            icon={require('lucide-react').Search}
            title="No results found"
            description="We couldn't find any trades matching your filters. Try adjusting your search criteria."
            action={
                onReset && (
                    <button
                        onClick={onReset}
                        className="bg-gradient-blue text-white px-6 py-3 rounded-lg hover:opacity-90 transition-smooth font-medium"
                    >
                        Clear Filters
                    </button>
                )
            }
            variant="warning"
        />
    );
}
