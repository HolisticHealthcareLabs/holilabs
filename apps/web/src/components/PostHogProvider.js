"use strict";
/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog analytics and provides it throughout the app
 * Includes HIPAA-compliant configuration
 */
'use client';
/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog analytics and provides it throughout the app
 * Includes HIPAA-compliant configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostHogProvider = PostHogProvider;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const posthog_1 = require("@/lib/posthog");
// Inner component that uses useSearchParams (must be wrapped in Suspense)
function PostHogPageView() {
    const pathname = (0, navigation_1.usePathname)();
    const searchParams = (0, navigation_1.useSearchParams)();
    // Track page views on route changes
    (0, react_1.useEffect)(() => {
        if (pathname) {
            // Build the full URL with search params
            const url = searchParams?.toString()
                ? `${pathname}?${searchParams.toString()}`
                : pathname;
            (0, posthog_1.trackPageView)(url);
        }
    }, [pathname, searchParams]);
    return null;
}
function PostHogProvider({ children }) {
    // Initialize PostHog on mount
    (0, react_1.useEffect)(() => {
        (0, posthog_1.initPostHog)();
    }, []);
    return (<>
      <react_1.Suspense fallback={null}>
        <PostHogPageView />
      </react_1.Suspense>
      {children}
    </>);
}
//# sourceMappingURL=PostHogProvider.js.map