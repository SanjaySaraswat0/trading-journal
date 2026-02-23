// lib/utils/api-response.ts
// Standardized API response utilities

import { NextResponse } from 'next/server';
import { logger, logError } from '@/lib/logging/logger';

/**
 * Standard API error codes
 */
export enum ApiErrorCode {
    // Client errors (4xx)
    BAD_REQUEST = 'BAD_REQUEST',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // Server errors (5xx)
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Error response structure
 */
export interface ApiErrorResponse {
    success: false;
    error: string;
    code: ApiErrorCode;
    details?: string;
    timestamp?: string;
}

/**
 * Success response structure
 */
export interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
    timestamp?: string;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
    message: string,
    code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: string,
    context?: string
): NextResponse<ApiErrorResponse> {
    const response: ApiErrorResponse = {
        success: false,
        error: message,
        code,
        details,
        timestamp: new Date().toISOString(),
    };

    // Log the error
    logError(
        new Error(message),
        context || 'API',
        { code, statusCode, details }
    );

    return NextResponse.json(response, { status: statusCode });
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
    data: T,
    message?: string,
    statusCode: number = 200
): NextResponse<ApiSuccessResponse<T>> {
    const response: ApiSuccessResponse<T> = {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: statusCode });
}

/**
 * Common error responses
 */
export const ApiErrors = {
    unauthorized: (message = 'Unauthorized access') =>
        errorResponse(message, ApiErrorCode.UNAUTHORIZED, 401),

    forbidden: (message = 'Access forbidden') =>
        errorResponse(message, ApiErrorCode.FORBIDDEN, 403),

    notFound: (resource = 'Resource', message?: string) =>
        errorResponse(
            message || `${resource} not found`,
            ApiErrorCode.NOT_FOUND,
            404
        ),

    badRequest: (message = 'Bad request', details?: string) =>
        errorResponse(message, ApiErrorCode.BAD_REQUEST, 400, details),

    validationError: (message = 'Validation failed', details?: string) =>
        errorResponse(message, ApiErrorCode.VALIDATION_ERROR, 400, details),

    rateLimit: (message = 'Rate limit exceeded') =>
        errorResponse(message, ApiErrorCode.RATE_LIMIT_EXCEEDED, 429),

    internalError: (message = 'Internal server error', details?: string) =>
        errorResponse(message, ApiErrorCode.INTERNAL_ERROR, 500, details),

    databaseError: (message = 'Database operation failed', details?: string) =>
        errorResponse(message, ApiErrorCode.DATABASE_ERROR, 500, details),

    aiServiceError: (message = 'AI service error', details?: string) =>
        errorResponse(message, ApiErrorCode.AI_SERVICE_ERROR, 500, details),
};

/**
 * Wrap async route handler with error handling
 */
export function withErrorHandling<T = any>(
    handler: (req: Request, context?: any) => Promise<NextResponse<T>>,
    context?: string
) {
    return async (req: Request, routeContext?: any): Promise<NextResponse<T | ApiErrorResponse>> => {
        try {
            return await handler(req, routeContext);
        } catch (error: any) {
            logger.error(`Unhandled error in ${context || 'API route'}`, {
                error: error.message,
                stack: error.stack,
            });

            return errorResponse(
                'An unexpected error occurred',
                ApiErrorCode.INTERNAL_ERROR,
                500,
                process.env.NODE_ENV === 'development' ? error.message : undefined,
                context
            );
        }
    };
}
