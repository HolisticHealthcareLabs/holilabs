/**
 * Edge Node Logger
 *
 * Simple Winston logger for edge node operations.
 * Logs to console and file for audit trail.
 */

import winston from 'winston';
import path from 'path';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_DIR || './logs';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'edge-node' },
  transports: [
    // Console output (always enabled)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? structuredFormat : consoleFormat,
    }),

    // File output (structured JSON)
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),

    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: structuredFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export default logger;
