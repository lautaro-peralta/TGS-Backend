// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import pino from 'pino';

// ============================================================================
// TYPE AUGMENTATION - Express
// ============================================================================

/**
 * Extends Express Request and Response interfaces to support
 * request tracking and performance monitoring
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
    interface Response {
      responseTime?: number;
    }
  }
}

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

/**
 * Pino logger instance with custom configuration
 *
 * Features:
 * - Configurable log levels via LOG_LEVEL env var
 * - Request/Response serialization with sensitive data redaction
 * - Pretty printing in development, file output in production
 * - Automatic PID, hostname, and service name binding
 */
const logger = pino(
  {
    // ──────────────────────────────────────────────────────────────────────
    // Base configuration
    // ──────────────────────────────────────────────────────────────────────
    level: process.env.LOG_LEVEL ?? 'info',

    // ──────────────────────────────────────────────────────────────────────
    // Output formatters
    // ──────────────────────────────────────────────────────────────────────
    formatters: {
      // Format log level as uppercase
      level: (label: string) => ({ level: label.toUpperCase() }),

      // Add service metadata to all logs
      bindings: (bindings: pino.Bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        service: process.env.SERVICE_NAME ?? 'api',
      }),
    },

    // ──────────────────────────────────────────────────────────────────────
    // Custom serializers for Express objects
    // ──────────────────────────────────────────────────────────────────────
    serializers: {
      // Extract relevant request information
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket?.remoteAddress,
        requestId: req.requestId,
      }),

      // Extract response metadata
      res: (res: any) => ({
        statusCode: res.statusCode,
        responseTime: res.responseTime,
      }),
    },

    // ──────────────────────────────────────────────────────────────────────
    // Sensitive data redaction
    // ──────────────────────────────────────────────────────────────────────
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
    ],
  },

  // ──────────────────────────────────────────────────────────────────────
  // Transport configuration (output destination)
  // ──────────────────────────────────────────────────────────────────────
  pino.transport({
    target: process.env.NODE_ENV === 'production' ? 'pino/file' : 'pino-pretty',
    options:
      process.env.NODE_ENV === 'production'
        ? // Production: Write to file
          { destination: './logs/app.log', mkdir: true }
        : // Development: Pretty print to console
          {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '{requestId} {levelname} - {msg}',
          },
  })
);

// ============================================================================
// EXPORTS
// ============================================================================
export default logger;
