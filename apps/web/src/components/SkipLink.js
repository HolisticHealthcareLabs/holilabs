"use strict";
/**
 * Skip Navigation Link
 * WCAG 2.1 Level A: 2.4.1 Bypass Blocks
 *
 * Allows keyboard users to skip repetitive navigation
 * and jump directly to main content
 */
'use client';
/**
 * Skip Navigation Link
 * WCAG 2.1 Level A: 2.4.1 Bypass Blocks
 *
 * Allows keyboard users to skip repetitive navigation
 * and jump directly to main content
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipLink = SkipLink;
function SkipLink() {
    return (<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary">
      Saltar al contenido principal
    </a>);
}
//# sourceMappingURL=SkipLink.js.map