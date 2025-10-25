"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.localeFlags = exports.localeLabels = exports.defaultLocale = exports.locales = void 0;
const navigation_1 = require("next/navigation");
const server_1 = require("next-intl/server");
// Define supported locales (Portuguese primary for Pequeno Cotolêngo pilot)
exports.locales = ['pt', 'en', 'es'];
exports.defaultLocale = 'pt';
// Locale display labels
exports.localeLabels = {
    pt: 'Português',
    en: 'English',
    es: 'Español',
};
// Locale flag emojis
exports.localeFlags = {
    pt: '🇧🇷',
    en: '🇺🇸',
    es: '🇪🇸',
};
exports.default = (0, server_1.getRequestConfig)(async ({ locale }) => {
    // Validate that the incoming `locale` parameter is valid
    if (!exports.locales.includes(locale))
        (0, navigation_1.notFound)();
    return {
        locale,
        messages: (await Promise.resolve(`${`../../messages/${locale}.json`}`).then(s => __importStar(require(s)))).default
    };
});
//# sourceMappingURL=i18n.js.map