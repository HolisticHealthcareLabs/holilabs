"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.generateSecret = generateSecret;
const crypto_1 = require("crypto");
function sha256(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
function generateSecret(bytes = 32) {
    return (0, crypto_1.randomBytes)(bytes).toString('hex');
}
//# sourceMappingURL=crypto.js.map