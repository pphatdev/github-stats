/**
 * Logger Configuration
 * Centralized logging setup with structured output
 */

import { getEnv } from './env.js';

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

export interface LogContext {
    [key: string]: any;
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

/**
 * Logger class for structured logging
 */
export class Logger {
    private context: LogContext;
    private minLevel: LogLevel;

    constructor(context: LogContext = {}, minLevel?: LogLevel) {
        this.context = context;
        this.minLevel = minLevel || this.getDefaultLogLevel();
    }

    /**
     * Get default log level from environment
     */
    private getDefaultLogLevel(): LogLevel {
        try {
            const env = getEnv();
            if (env.DEBUG) return LogLevel.DEBUG;
            if (env.APP_ENV === 'development') return LogLevel.DEBUG;
            if (env.APP_ENV === 'test') return LogLevel.WARN;
            return LogLevel.INFO;
        } catch {
            return LogLevel.INFO;
        }
    }

    /**
     * Create child logger with additional context
     */
    child(additionalContext: LogContext): Logger {
        return new Logger({ ...this.context, ...additionalContext }, this.minLevel);
    }

    /**
     * Set minimum log level
     */
    setLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    /**
     * Check if level should be logged
     */
    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        return levels.indexOf(level) >= levels.indexOf(this.minLevel);
    }

    /**
     * Format output based on environment
     */
    private formatOutput(entry: LogEntry): string {
        try {
            const env = getEnv();
            if (env.APP_ENV === 'production') {
                // JSON format for production (easy to parse by log aggregators)
                return JSON.stringify(entry);
            }
        } catch {
            // If env not available, use human-readable format
        }

        // Human-readable format for development
        const { timestamp, level, message, context, error } = entry;
        const time = new Date(timestamp).toLocaleTimeString();
        const levelStr = level.toUpperCase().padEnd(5);
        
        let output = `[${time}] ${levelStr} ${message}`;
        
        if (context && Object.keys(context).length > 0) {
            output += ` ${JSON.stringify(context)}`;
        }
        
        if (error) {
            output += `\n  Error: ${error.name}: ${error.message}`;
            if (error.stack) {
                output += `\n${error.stack}`;
            }
        }
        
        return output;
    }

    /**
     * Format and output log entry
     */
    private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: { ...this.context, ...context },
        };

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }

        const output = this.formatOutput(entry);

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(output);
                break;
            case LogLevel.INFO:
                console.info(output);
                break;
            case LogLevel.WARN:
                console.warn(output);
                break;
            case LogLevel.ERROR:
                console.error(output);
                break;
        }
    }

    /**
     * Log debug message
     */
    debug(message: string, context?: LogContext): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    /**
     * Log info message
     */
    info(message: string, context?: LogContext): void {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * Log warning message
     */
    warn(message: string, context?: LogContext): void {
        this.log(LogLevel.WARN, message, context);
    }

    /**
     * Log error message
     */
    error(message: string, context?: LogContext, error?: Error): void {
        this.log(LogLevel.ERROR, message, context, error);
    }
}

// Singleton logger instance
let loggerInstance: Logger | null = null;

/**
 * Get the default logger instance
 */
export function getLogger(context?: LogContext): Logger {
    if (!loggerInstance) {
        loggerInstance = new Logger(context);
    }
    return loggerInstance;
}

/**
 * Create a logger with specific context
 */
export function createLogger(context: LogContext): Logger {
    return new Logger(context);
}
