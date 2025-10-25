"use strict";
/**
 * Skeleton Components Index
 * Export all loading skeletons
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScribeSkeleton = exports.PatientDetailSkeleton = exports.PatientListSkeleton = exports.DashboardSkeleton = void 0;
__exportStar(require("./SkeletonBase"), exports);
var DashboardSkeleton_1 = require("./DashboardSkeleton");
Object.defineProperty(exports, "DashboardSkeleton", { enumerable: true, get: function () { return DashboardSkeleton_1.DashboardSkeleton; } });
var PatientListSkeleton_1 = require("./PatientListSkeleton");
Object.defineProperty(exports, "PatientListSkeleton", { enumerable: true, get: function () { return PatientListSkeleton_1.PatientListSkeleton; } });
var PatientDetailSkeleton_1 = require("./PatientDetailSkeleton");
Object.defineProperty(exports, "PatientDetailSkeleton", { enumerable: true, get: function () { return PatientDetailSkeleton_1.PatientDetailSkeleton; } });
var ScribeSkeleton_1 = require("./ScribeSkeleton");
Object.defineProperty(exports, "ScribeSkeleton", { enumerable: true, get: function () { return ScribeSkeleton_1.ScribeSkeleton; } });
//# sourceMappingURL=index.js.map