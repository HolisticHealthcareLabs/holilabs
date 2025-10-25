"use strict";
'use client';
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
exports.LanguageProvider = LanguageProvider;
exports.useLanguage = useLanguage;
/**
 * Language Context Provider
 * Manages language selection with localStorage persistence
 * Default: Portuguese (for Pequeno Cotolêngo pilot)
 */
const react_1 = require("react");
const i18n_1 = require("@/i18n");
const LanguageContext = (0, react_1.createContext)(undefined);
function LanguageProvider({ children }) {
    const [locale, setLocaleState] = (0, react_1.useState)(i18n_1.defaultLocale);
    const [translations, setTranslations] = (0, react_1.useState)({});
    // Load locale from localStorage on mount
    (0, react_1.useEffect)(() => {
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale && ['pt', 'en', 'es'].includes(savedLocale)) {
            setLocaleState(savedLocale);
        }
    }, []);
    // Load translations when locale changes
    (0, react_1.useEffect)(() => {
        const loadTranslations = async () => {
            try {
                const messages = await Promise.resolve(`${`../../messages/${locale}.json`}`).then(s => __importStar(require(s)));
                setTranslations(messages.default);
            }
            catch (error) {
                console.error('Error loading translations:', error);
            }
        };
        loadTranslations();
    }, [locale]);
    const setLocale = (newLocale) => {
        setLocaleState(newLocale);
        localStorage.setItem('locale', newLocale);
    };
    // Translation function with dot notation support
    const t = (key) => {
        const keys = key.split('.');
        let value = translations;
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) {
                console.warn(`Translation missing for key: ${key}`);
                return key;
            }
        }
        return typeof value === 'string' ? value : key;
    };
    return (<LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>);
}
function useLanguage() {
    const context = (0, react_1.useContext)(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
//# sourceMappingURL=LanguageContext.js.map