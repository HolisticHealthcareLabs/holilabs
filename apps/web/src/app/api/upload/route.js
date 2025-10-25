"use strict";
/**
 * File Upload API
 *
 * POST /api/upload
 * Upload files to Cloudflare R2 storage
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const file_storage_1 = require("@/lib/storage/file-storage");
const logger_1 = __importDefault(require("@/lib/logger"));
const rate_limit_1 = require("@/lib/rate-limit");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
async function POST(request) {
    try {
        // Rate limiting for file uploads
        const rateLimitError = await (0, rate_limit_1.checkRateLimit)(request, 'upload');
        if (rateLimitError)
            return rateLimitError;
        // Authenticate user (clinician or patient)
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        let userId;
        let userType;
        if (clinicianSession?.user?.id) {
            userId = clinicianSession.user.id;
            userType = 'clinician';
        }
        else {
            // Try patient session
            try {
                const { requirePatientSession } = await Promise.resolve().then(() => __importStar(require('@/lib/auth/patient-session')));
                const patientSession = await requirePatientSession();
                userId = patientSession.patientId;
                userType = 'patient';
            }
            catch (error) {
                return server_1.NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
            }
        }
        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return server_1.NextResponse.json({ success: false, error: 'No se proporcionó archivo' }, { status: 400 });
        }
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return server_1.NextResponse.json({
                success: false,
                error: `Archivo demasiado grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
            }, { status: 400 });
        }
        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        // Create Express.Multer.File-like object
        const multerFile = {
            fieldname: 'file',
            originalname: file.name,
            encoding: '7bit',
            mimetype: file.type,
            buffer: buffer,
            size: buffer.length,
        };
        // Upload to storage
        const result = await (0, file_storage_1.uploadFile)(multerFile, {
            userId,
            userType,
            generateThumbnail: true,
        });
        logger_1.default.info({
            event: 'file_uploaded',
            userId,
            userType,
            filename: file.name,
            fileSize: result.fileSize,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Archivo subido correctamente',
            data: result,
        }, { status: 201 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'file_upload_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Error al subir archivo',
        }, { status: 500 });
    }
}
// Configure route segment to handle large files
exports.dynamic = 'force-dynamic';
exports.maxDuration = 300; // 5 minutes for large file uploads
//# sourceMappingURL=route.js.map