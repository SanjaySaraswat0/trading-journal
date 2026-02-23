// lib/logging/logger.ts
// Winston logging configuration

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Log level from environment or default to 'info'
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs';

// Custom format for better readability
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    winston.format.printf((info) => {
        let log = `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;

        // Add metadata if present
        if (info.metadata && Object.keys(info.metadata).length > 0) {
            log += ` ${JSON.stringify(info.metadata)}`;
        }

        return log;
    })
);

// Console format with colors
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level}: ${message}`;
    })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
            level: LOG_LEVEL,
        })
    );
}

// Daily rotate file transport for general logs
transports.push(
    new DailyRotateFile({
        filename: `${LOG_FILE_PATH}/app-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: customFormat,
        level: LOG_LEVEL,
    })
);

// Daily rotate file transport for errors only
transports.push(
    new DailyRotateFile({
        filename: `${LOG_FILE_PATH}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: customFormat,
        level: 'error',
    })
);

// Create the logger
export const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: customFormat,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
});

// ==========================================
// HELPER LOGGING FUNCTIONS
// ==========================================

/**
 * Log authentication events
 */
export function logAuth(event: string, userId?: string, metadata?: any) {
    logger.info(`AUTH: ${event}`, {
        userId,
        ...metadata,
    });
}

/**
 * Log API requests
 */
export function logApiRequest(method: string, path: string, userId?: string, metadata?: any) {
    logger.info(`API: ${method} ${path}`, {
        userId,
        ...metadata,
    });
}

/**
 * Log database operations
 */
export function logDatabase(operation: string, table: string, metadata?: any) {
    logger.info(`DB: ${operation} on ${table}`, metadata);
}

/**
 * Log AI operations
 */
export function logAI(operation: string, metadata?: any) {
    logger.info(`AI: ${operation}`, metadata);
}

/**
 * Log security events
 */
export function logSecurity(event: string, severity: 'low' | 'medium' | 'high', metadata?: any) {
    logger.warn(`SECURITY [${severity.toUpperCase()}]: ${event}`, metadata);
}

/**
 * Log rate limit hits
 */
export function logRateLimit(endpoint: string, identifier: string, metadata?: any) {
    logger.warn(`RATE_LIMIT: ${endpoint} blocked for ${identifier}`, metadata);
}

/**
 * Log errors with stack trace
 */
export function logError(error: Error | any, context?: string, metadata?: any) {
    logger.error(`ERROR${context ? ` in ${context}` : ''}: ${error.message || error}`, {
        stack: error.stack,
        ...metadata,
    });
}

/**
 * Redact sensitive data from logs
 */
export function redactSensitiveData(data: any): any {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization'];

    if (typeof data !== 'object' || data === null) {
        return data;
    }

    const redacted = { ...data };

    for (const key in redacted) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            redacted[key] = '[REDACTED]';
        } else if (typeof redacted[key] === 'object') {
            redacted[key] = redactSensitiveData(redacted[key]);
        }
    }

    return redacted;
}

export default logger;
