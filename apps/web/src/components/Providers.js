"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Providers = Providers;
const ErrorBoundary_1 = require("@/components/ErrorBoundary");
const PostHogProvider_1 = require("@/components/PostHogProvider");
function Providers({ children }) {
    return (<ErrorBoundary_1.ErrorBoundary>
      <PostHogProvider_1.PostHogProvider>
        {children}
      </PostHogProvider_1.PostHogProvider>
    </ErrorBoundary_1.ErrorBoundary>);
}
//# sourceMappingURL=Providers.js.map