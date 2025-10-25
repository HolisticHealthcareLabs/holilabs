"use strict";
/**
 * Opt-Out Token Generation
 * TCPA & CAN-SPAM Compliance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptPatientId = encryptPatientId;
exports.generateSmsOptOutUrl = generateSmsOptOutUrl;
exports.generateEmailOptOutUrl = generateEmailOptOutUrl;
exports.generateOptOutUrl = generateOptOutUrl;
exports.generateSmsOptOutText = generateSmsOptOutText;
exports.generateEmailOptOutFooter = generateEmailOptOutFooter;
const crypto_1 = __importDefault(require("crypto"));
const SECRET_KEY = process.env.OPT_OUT_SECRET_KEY || 'default-secret-key-change-me';
/**
 * Encrypt patient ID to create opt-out token
 */
function encryptPatientId(patientId) {
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', crypto_1.default.createHash('sha256').update(SECRET_KEY).digest(), Buffer.alloc(16, 0) // IV should be random and stored with token in production
    );
    let encrypted = cipher.update(patientId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}
/**
 * Generate opt-out URL for SMS
 */
function generateSmsOptOutUrl(patientId, baseUrl) {
    const token = encryptPatientId(patientId);
    const domain = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.com';
    return `${domain}/api/patients/preferences/opt-out?token=${token}&type=sms`;
}
/**
 * Generate opt-out URL for email
 */
function generateEmailOptOutUrl(patientId, baseUrl) {
    const token = encryptPatientId(patientId);
    const domain = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.com';
    return `${domain}/api/patients/preferences/opt-out?token=${token}&type=email`;
}
/**
 * Generate opt-out URL for all communications
 */
function generateOptOutUrl(patientId, baseUrl) {
    const token = encryptPatientId(patientId);
    const domain = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.com';
    return `${domain}/api/patients/preferences/opt-out?token=${token}&type=all`;
}
/**
 * Generate short opt-out message for SMS (TCPA required)
 * Example: "Reply STOP to opt-out or visit: https://..."
 */
function generateSmsOptOutText(patientId) {
    const url = generateSmsOptOutUrl(patientId);
    return `Reply STOP to opt-out or visit: ${url}`;
}
/**
 * Generate opt-out footer for emails (CAN-SPAM required)
 */
function generateEmailOptOutFooter(patientId) {
    const url = generateEmailOptOutUrl(patientId);
    return `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; text-align: center;">
  <p>Para dejar de recibir estos correos, haz clic aquí: <a href="${url}" style="color: #667eea;">Cancelar suscripción</a></p>
  <p style="margin-top: 8px;">HoliLabs Health AI • Guadalajara, México</p>
</div>
`;
}
//# sourceMappingURL=opt-out.js.map