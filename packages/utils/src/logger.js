"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
const pino_1 = __importDefault(require("pino"));
const createLogger = (name) => {
    return (0, pino_1.default)({
        name,
        level: process.env.LOG_LEVEL || 'info',
        redact: {
            paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.email',
                '*.ssn',
                '*.cpf',
                '*.curp',
                '*.dni',
            ],
            remove: true,
        },
    });
};
exports.createLogger = createLogger;
//# sourceMappingURL=logger.js.map