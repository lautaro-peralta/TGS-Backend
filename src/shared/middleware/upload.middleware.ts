// ============================================================================
// UPLOAD MIDDLEWARE - File upload validation and handling with Multer
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import logger from '../utils/logger.js';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Allowed MIME types for image uploads
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Maximum number of files per request
 */
const MAX_FILES = 5;

// ============================================================================
// Multer Configuration
// ============================================================================

/**
 * File filter to validate MIME types
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    logger.debug(`Accepting file: ${file.originalname} (${file.mimetype})`);
    callback(null, true);
  } else {
    logger.warn(
      `Rejecting file: ${file.originalname} (${file.mimetype}) - Invalid type`
    );
    callback(
      new Error(
        `Invalid file type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`
      )
    );
  }
};

/**
 * Multer instance configured for memory storage
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter,
});

// ============================================================================
// Middleware Exports
// ============================================================================

/**
 * Middleware for uploading a single file
 */
export const uploadSingle = upload.single('image');

/**
 * Middleware for uploading multiple files (up to 5)
 */
export const uploadMultiple = upload.array('images', MAX_FILES);

// ============================================================================
// Error Handling Middleware
// ============================================================================

/**
 * Middleware to handle multer errors
 */
export function handleUploadError(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    logger.error(`Multer error: ${err.code} - ${err.message}`);

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          message: 'File too large',
          error: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE',
        }) as any;

      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files',
          error: `Maximum ${MAX_FILES} files allowed per request`,
          code: 'TOO_MANY_FILES',
        }) as any;

      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field',
          error: 'Use "image" for single upload or "images" for multiple uploads',
          code: 'UNEXPECTED_FIELD',
        }) as any;

      default:
        return res.status(400).json({
          success: false,
          message: 'Upload error',
          error: err.message,
          code: 'UPLOAD_ERROR',
        }) as any;
    }
  }

  if (err) {
    logger.error(`Upload error: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: 'File upload failed',
      error: err.message,
      code: 'UPLOAD_FAILED',
    }) as any;
  }

  next();
}

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Validates that at least one file was uploaded
 */
export function validateFilesExist(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const files = req.files as Express.Multer.File[];
  const file = req.file;

  if (!files && !file) {
    logger.warn('No files provided in upload request');
    return res.status(400).json({
      success: false,
      message: 'No files provided',
      error: 'At least one file is required',
      code: 'NO_FILES',
    }) as any;
  }

  if (files && files.length === 0) {
    logger.warn('Empty files array in upload request');
    return res.status(400).json({
      success: false,
      message: 'No files provided',
      error: 'At least one file is required',
      code: 'NO_FILES',
    }) as any;
  }

  logger.debug(
    `Files validated: ${files ? files.length : 1} file(s) uploaded`
  );
  next();
}

/**
 * Rate limiting for uploads
 * Simple in-memory implementation - use Redis for production
 */
interface UploadStats {
  count: number;
  bytes: number;
  resetDate: Date;
}

const uploadStatsMap = new Map<string, UploadStats>();

/**
 * Middleware to enforce monthly upload limits
 */
export function uploadRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = (req as any).user?.id || req.ip || 'anonymous';
  const now = new Date();

  let stats = uploadStatsMap.get(userId);

  // Initialize or reset stats if month changed
  if (
    !stats ||
    now.getMonth() !== stats.resetDate.getMonth() ||
    now.getFullYear() !== stats.resetDate.getFullYear()
  ) {
    stats = {
      count: 0,
      bytes: 0,
      resetDate: now,
    };
    uploadStatsMap.set(userId, stats);
  }

  // Check monthly limit (500MB for free tier)
  const MONTHLY_LIMIT_MB = 500;
  const usedMB = stats.bytes / (1024 * 1024);

  if (usedMB >= MONTHLY_LIMIT_MB) {
    const resetDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    ).toISOString();

    logger.warn(
      `Upload limit exceeded for user ${userId}: ${usedMB.toFixed(2)}MB / ${MONTHLY_LIMIT_MB}MB`
    );

    return res.status(429).json({
      success: false,
      message: 'Monthly upload limit exceeded',
      error: {
        limit: `${MONTHLY_LIMIT_MB}MB`,
        used: `${usedMB.toFixed(2)}MB`,
        resetDate,
      },
      code: 'UPLOAD_LIMIT_EXCEEDED',
    }) as any;
  }

  // Track upload size after response completes
  res.on('finish', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      const contentLength = req.headers['content-length'];
      if (contentLength) {
        stats!.bytes += parseInt(contentLength);
        stats!.count++;
        logger.debug(
          `Upload stats updated for user ${userId}: ${stats!.count} uploads, ${(stats!.bytes / (1024 * 1024)).toFixed(2)}MB used`
        );
      }
    }
  });

  next();
}
