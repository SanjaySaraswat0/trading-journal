'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo: errorInfo.componentStack,
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
                    <div className="glass-card max-w-2xl w-full border-2 border-red-300">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="bg-red-500 p-3 rounded-xl">
                                <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                    Oops! Something went wrong
                                </h1>
                                <p className="text-gray-700 mb-4">
                                    We encountered an unexpected error. Don't worry - your data is safe.
                                    Try refreshing the page to continue.
                                </p>
                            </div>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-gray-100 rounded-lg overflow-auto">
                                <p className="font-mono text-sm text-red-700 font-bold mb-2">
                                    {this.state.error.message}
                                </p>
                                <pre className="font-mono text-xs text-gray-600 overflow-auto">
                                    {this.state.error.stack}
                                </pre>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 bg-gradient-blue text-white px-6 py-3 rounded-lg hover:opacity-90 transition-smooth font-medium flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh Page
                            </button>
                            <a
                                href="/dashboard"
                                className="flex-1 glass-card glass-hover px-6 py-3 rounded-lg font-medium text-center border-2 border-blue-400"
                            >
                                Go to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
