"use strict";
/**
 * File Storage Utility
 *
 * Handles file uploads with validation, compression, and secure storage
 * Supports local storage with option to use S3/cloud storage
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
exports.getFileInfo = getFileInfo;
exports.fileExists = fileExists;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = __importDefault(require("../logger"));
const UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads');
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
/**
 * Initialize upload directory
 */
async function ensureUploadDir() {
    try {
        await promises_1.default.access(UPLOAD_DIR);
    }
    catch {
        await promises_1.default.mkdir(UPLOAD_DIR, { recursive: true });
        logger_1.default.info({ event: 'upload_dir_created', path: UPLOAD_DIR });
    }
}
/**
 * Generate unique filename
 */
function generateFileName(originalName) {
    const ext = path_1.default.extname(originalName);
    const random = (0, crypto_1.randomBytes)(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${random}${ext}`;
}
/**
 * Validate file
 */
function validateFile(file, options) {
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
    logger_1.default.info({
        event: 'file_validated',
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
    });
}
/**
 * Generate thumbnail for images
 */
async function generateThumbnail(filePath, fileName) {
    try {
        const thumbnailName = `thumb-${fileName}`;
        const thumbnailPath = path_1.default.join(UPLOAD_DIR, thumbnailName);
        await (0, sharp_1.default)(filePath)
            .resize(300, 300, {
            fit: 'inside',
            withoutEnlargement: true,
        })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
        logger_1.default.info({
            event: 'thumbnail_generated',
            originalFile: fileName,
            thumbnailFile: thumbnailName,
        });
        return `/uploads/${thumbnailName}`;
    }
    catch (error) {
        logger_1.default.error({
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
async function optimizeImage(filePath, mimeType) {
    try {
        const tempPath = `${filePath}.tmp`;
        // Optimize based on type
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            await (0, sharp_1.default)(filePath)
                .jpeg({ quality: 85, progressive: true })
                .toFile(tempPath);
        }
        else if (mimeType === 'image/png') {
            await (0, sharp_1.default)(filePath)
                .png({ quality: 85, compressionLevel: 9 })
                .toFile(tempPath);
        }
        else if (mimeType === 'image/webp') {
            await (0, sharp_1.default)(filePath)
                .webp({ quality: 85 })
                .toFile(tempPath);
        }
        else {
            return; // Skip optimization for other types
        }
        // Replace original with optimized
        await promises_1.default.rename(tempPath, filePath);
        logger_1.default.info({
            event: 'image_optimized',
            filePath,
            mimeType,
        });
    }
    catch (error) {
        logger_1.default.error({
            event: 'image_optimization_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            filePath,
        });
    }
}
/**
 * Upload file
 */
async function uploadFile(file, options) {
    try {
        // Ensure upload directory exists
        await ensureUploadDir();
        // Validate file
        validateFile(file, options);
        // Generate unique filename
        const fileName = generateFileName(file.originalname);
        const filePath = path_1.default.join(UPLOAD_DIR, fileName);
        // Save file
        await promises_1.default.writeFile(filePath, file.buffer);
        // Optimize images
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            await optimizeImage(filePath, file.mimetype);
        }
        // Generate thumbnail for images
        let thumbnailUrl;
        if (options.generateThumbnail && ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            thumbnailUrl = await generateThumbnail(filePath, fileName) || undefined;
        }
        const result = {
            fileName,
            originalName: file.originalname,
            fileUrl: `/uploads/${fileName}`,
            fileType: file.mimetype,
            fileSize: file.size,
            thumbnailUrl,
        };
        logger_1.default.info({
            event: 'file_uploaded',
            fileName,
            originalName: file.originalname,
            fileSize: file.size,
            userId: options.userId,
            userType: options.userType,
        });
        return result;
    }
    catch (error) {
        logger_1.default.error({
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
async function deleteFile(fileName) {
    try {
        const filePath = path_1.default.join(UPLOAD_DIR, fileName);
        await promises_1.default.unlink(filePath);
        // Delete thumbnail if exists
        const thumbnailName = `thumb-${fileName}`;
        const thumbnailPath = path_1.default.join(UPLOAD_DIR, thumbnailName);
        try {
            await promises_1.default.unlink(thumbnailPath);
        }
        catch {
            // Thumbnail doesn't exist, ignore
        }
        logger_1.default.info({
            event: 'file_deleted',
            fileName,
        });
    }
    catch (error) {
        logger_1.default.error({
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
async function getFileInfo(fileName) {
    try {
        const filePath = path_1.default.join(UPLOAD_DIR, fileName);
        const stats = await promises_1.default.stat(filePath);
        return {
            fileName,
            fileSize: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
        };
    }
    catch (error) {
        logger_1.default.error({
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
async function fileExists(fileName) {
    try {
        const filePath = path_1.default.join(UPLOAD_DIR, fileName);
        await promises_1.default.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=file-storage.js.map