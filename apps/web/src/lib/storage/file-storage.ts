/**
 * File Storage Utility
 *
 * Handles file uploads with validation, compression, and secure storage
 * Supports local storage with option to use S3/cloud storage
 */

import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import logger from '../logger';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export interface FileUploadResult {
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
}

export interface FileUploadOptions {
  userId: string;
  userType: 'clinician' | 'patient';
  maxSize?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
}

/**
 * Initialize upload directory
 */
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    logger.info({ event: 'upload_dir_created', path: UPLOAD_DIR });
  }
}

/**
 * Generate unique filename
 */
function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const random = randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${random}${ext}`;
}

/**
 * Validate file
 */
function validateFile(
  file: Express.Multer.File,
  options: FileUploadOptions
): void {
  const maxSize = options.maxSize || MAX_FILE_SIZE;
  const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES;

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`El archivo es demasiado grande. Tamaño máximo: ${maxSize / 1024 / 1024}MB`);
  }

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`);
  }

  logger.info({
    event: 'file_validated',
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  });
}

/**
 * Generate thumbnail for images
 */
async function generateThumbnail(
  filePath: string,
  fileName: string
): Promise<string | null> {
  try {
    const thumbnailName = `thumb-${fileName}`;
    const thumbnailPath = path.join(UPLOAD_DIR, thumbnailName);

    await sharp(filePath)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    logger.info({
      event: 'thumbnail_generated',
      originalFile: fileName,
      thumbnailFile: thumbnailName,
    });

    return `/uploads/${thumbnailName}`;
  } catch (error) {
    logger.error({
      event: 'thumbnail_generation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName,
    });
    return null;
  }
}

/**
 * Optimize image
 */
async function optimizeImage(
  filePath: string,
  mimeType: string
): Promise<void> {
  try {
    const tempPath = `${filePath}.tmp`;

    // Optimize based on type
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      await sharp(filePath)
        .jpeg({ quality: 85, progressive: true })
        .toFile(tempPath);
    } else if (mimeType === 'image/png') {
      await sharp(filePath)
        .png({ quality: 85, compressionLevel: 9 })
        .toFile(tempPath);
    } else if (mimeType === 'image/webp') {
      await sharp(filePath)
        .webp({ quality: 85 })
        .toFile(tempPath);
    } else {
      return; // Skip optimization for other types
    }

    // Replace original with optimized
    await fs.rename(tempPath, filePath);

    logger.info({
      event: 'image_optimized',
      filePath,
      mimeType,
    });
  } catch (error) {
    logger.error({
      event: 'image_optimization_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      filePath,
    });
  }
}

/**
 * Upload file
 */
export async function uploadFile(
  file: Express.Multer.File,
  options: FileUploadOptions
): Promise<FileUploadResult> {
  try {
    // Ensure upload directory exists
    await ensureUploadDir();

    // Validate file
    validateFile(file, options);

    // Generate unique filename
    const fileName = generateFileName(file.originalname);
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Optimize images
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      await optimizeImage(filePath, file.mimetype);
    }

    // Generate thumbnail for images
    let thumbnailUrl: string | undefined;
    if (options.generateThumbnail && ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      thumbnailUrl = await generateThumbnail(filePath, fileName) || undefined;
    }

    const result: FileUploadResult = {
      fileName,
      originalName: file.originalname,
      fileUrl: `/uploads/${fileName}`,
      fileType: file.mimetype,
      fileSize: file.size,
      thumbnailUrl,
    };

    logger.info({
      event: 'file_uploaded',
      fileName,
      originalName: file.originalname,
      fileSize: file.size,
      userId: options.userId,
      userType: options.userType,
    });

    return result;
  } catch (error) {
    logger.error({
      event: 'file_upload_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName: file.originalname,
    });
    throw error;
  }
}

/**
 * Delete file
 */
export async function deleteFile(fileName: string): Promise<void> {
  try {
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.unlink(filePath);

    // Delete thumbnail if exists
    const thumbnailName = `thumb-${fileName}`;
    const thumbnailPath = path.join(UPLOAD_DIR, thumbnailName);
    try {
      await fs.unlink(thumbnailPath);
    } catch {
      // Thumbnail doesn't exist, ignore
    }

    logger.info({
      event: 'file_deleted',
      fileName,
    });
  } catch (error) {
    logger.error({
      event: 'file_delete_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName,
    });
    throw error;
  }
}

/**
 * Get file info
 */
export async function getFileInfo(fileName: string) {
  try {
    const filePath = path.join(UPLOAD_DIR, fileName);
    const stats = await fs.stat(filePath);

    return {
      fileName,
      fileSize: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  } catch (error) {
    logger.error({
      event: 'get_file_info_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName,
    });
    throw error;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(fileName: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
