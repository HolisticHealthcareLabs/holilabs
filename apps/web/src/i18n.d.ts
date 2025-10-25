export declare const locales: readonly ["pt", "en", "es"];
export declare const defaultLocale: "pt";
export type Locale = (typeof locales)[number];
export declare const localeLabels: Record<Locale, string>;
export declare const localeFlags: Record<Locale, string>;
declare const _default: (params: import("next-intl/server").GetRequestConfigParams) => import("next-intl/server").RequestConfig | Promise<import("next-intl/server").RequestConfig>;
export default _default;
//# sourceMappingURL=i18n.d.ts.map