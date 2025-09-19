import pino from 'pino';

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

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level: (label: string) => ({ level: label.toUpperCase() }),
      bindings: (bindings: pino.Bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        service: process.env.SERVICE_NAME ?? 'api',
      }),
    },
    serializers: {
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket?.remoteAddress,
        requestId: req.requestId,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
        responseTime: res.responseTime,
      }),
    },
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
    ],
  },
  pino.transport({
    target: process.env.NODE_ENV === 'production' ? 'pino/file' : 'pino-pretty',
    options:
      process.env.NODE_ENV === 'production'
        ? { destination: './logs/app.log', mkdir: true }
        : {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '{requestId} {levelname} - {msg}',
          },
  })
);

export default logger;
