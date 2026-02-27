/**
 * Structured Logging Framework
 * Provides consistent, structured logging across the application
 */

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

    constructor(context: LogContext = {}, minLevel: LogLevel = LogLevel.INFO) {
        this.context = context;
        this.minLevel = minLevel;
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

        // In production, you might want to send this to a logging service
        // For now, we'll use console with structured output
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
     * Format log entry for output
     */
    private formatOutput(entry: LogEntry): string {
        // Development: Pretty print
        if (process.env.NODE_ENV !== 'production') {
            const emoji = this.getLevelEmoji(entry.level);
            let output = `${emoji} [${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;

            if (entry.context && Object.keys(entry.context).length > 0) {
                try {
                    output += `\n   Context: ${JSON.stringify(entry.context, null, 2)}`;
                } catch (e) {
                    // Handle objects with null prototypes
                    output += `\n   Context: [Unable to serialize context]`;
                }
            }

            if (entry.error) {
                output += `\n   Error: ${entry.error.name}: ${entry.error.message}`;
                if (entry.error.stack) {
                    output += `\n${entry.error.stack}`;
                }
            }

            return output;
        }

        // Production: JSON output for log aggregation services
        try {
            return JSON.stringify(entry);
        } catch (e) {
            // Fallback for objects that can't be stringified
            return JSON.stringify({
                timestamp: entry.timestamp,
                level: entry.level,
                message: entry.message,
                error: 'Unable to serialize log entry'
            });
        }
    }

    /**
     * Get emoji for log level
     */
    private getLevelEmoji(level: LogLevel): string {
        switch (level) {
            case LogLevel.DEBUG:
                return '🔍';
            case LogLevel.INFO:
                return 'ℹ️';
            case LogLevel.WARN:
                return '⚠️';
            case LogLevel.ERROR:
                return '❌';
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
    error(message: string, error?: Error, context?: LogContext): void {
        this.log(LogLevel.ERROR, message, context, error);
    }

    /**
     * Log with custom level
     */
    logWithLevel(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
        this.log(level, message, context, error);
    }
}

// Global logger instance
let globalLogger: Logger | null = null;

/**
 * Get global logger instance
 */
export function getLogger(context?: LogContext): Logger {
    if (!globalLogger) {
        const level = process.env.LOG_LEVEL as LogLevel || 
                     (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG);
        globalLogger = new Logger({}, level);
    }

    if (context) {
        return globalLogger.child(context);
    }

    return globalLogger;
}

/**
 * Create a logger with specific context
 */
export function createLogger(context: LogContext): Logger {
    return getLogger(context);
}
