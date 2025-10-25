"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardTile;
const link_1 = __importDefault(require("next/link"));
const colorStyles = {
    blue: {
        gradient: 'from-blue-500 to-cyan-600',
        hover: 'hover:from-blue-600 hover:to-cyan-700',
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-700',
        glow: 'shadow-blue-500/30 dark:shadow-blue-400/20'
    },
    green: {
        gradient: 'from-green-500 to-emerald-600',
        hover: 'hover:from-green-600 hover:to-emerald-700',
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-700',
        glow: 'shadow-green-500/30 dark:shadow-green-400/20'
    },
    purple: {
        gradient: 'from-purple-500 to-fuchsia-600',
        hover: 'hover:from-purple-600 hover:to-fuchsia-700',
        text: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-700',
        glow: 'shadow-purple-500/30 dark:shadow-purple-400/20'
    },
    orange: {
        gradient: 'from-orange-500 to-amber-600',
        hover: 'hover:from-orange-600 hover:to-amber-700',
        text: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-700',
        glow: 'shadow-orange-500/30 dark:shadow-orange-400/20'
    },
    pink: {
        gradient: 'from-pink-500 to-rose-600',
        hover: 'hover:from-pink-600 hover:to-rose-700',
        text: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        border: 'border-pink-200 dark:border-pink-700',
        glow: 'shadow-pink-500/30 dark:shadow-pink-400/20'
    },
    teal: {
        gradient: 'from-teal-500 to-cyan-600',
        hover: 'hover:from-teal-600 hover:to-cyan-700',
        text: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        border: 'border-teal-200 dark:border-teal-700',
        glow: 'shadow-teal-500/30 dark:shadow-teal-400/20'
    },
    indigo: {
        gradient: 'from-indigo-500 to-violet-600',
        hover: 'hover:from-indigo-600 hover:to-violet-700',
        text: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-700',
        glow: 'shadow-indigo-500/30 dark:shadow-indigo-400/20'
    },
    red: {
        gradient: 'from-red-500 to-orange-600',
        hover: 'hover:from-red-600 hover:to-orange-700',
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-700',
        glow: 'shadow-red-500/30 dark:shadow-red-400/20'
    },
    emerald: {
        gradient: 'from-emerald-500 to-teal-600',
        hover: 'hover:from-emerald-600 hover:to-teal-700',
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-700',
        glow: 'shadow-emerald-500/30 dark:shadow-emerald-400/20'
    },
    amber: {
        gradient: 'from-amber-500 to-orange-600',
        hover: 'hover:from-amber-600 hover:to-orange-700',
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-700',
        glow: 'shadow-amber-500/30 dark:shadow-amber-400/20'
    },
    rose: {
        gradient: 'from-rose-500 to-pink-600',
        hover: 'hover:from-rose-600 hover:to-pink-700',
        text: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-200 dark:border-rose-700',
        glow: 'shadow-rose-500/30 dark:shadow-rose-400/20'
    },
    cyan: {
        gradient: 'from-cyan-500 to-blue-600',
        hover: 'hover:from-cyan-600 hover:to-blue-700',
        text: 'text-cyan-600 dark:text-cyan-400',
        bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        border: 'border-cyan-200 dark:border-cyan-700',
        glow: 'shadow-cyan-500/30 dark:shadow-cyan-400/20'
    },
};
function DashboardTile({ title, description, icon, href, color, badge, chartEmoji = '📊', onClick, }) {
    const styles = colorStyles[color];
    const tileContent = (<div className={`
        group relative overflow-hidden
        bg-white dark:bg-gray-800
        border-2 ${styles.border}
        rounded-2xl shadow-lg
        hover:shadow-2xl ${styles.glow}
        transition-all duration-300
        hover:scale-105 hover:-translate-y-1
        cursor-pointer
        p-6
      `} onClick={onClick}>
      {/* Chart Emoji Halo at Top */}
      <div className="absolute -top-4 -right-4 text-6xl opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
        {chartEmoji}
      </div>

      {/* Badge */}
      {badge && (<div className={`
          absolute top-4 right-4
          px-3 py-1 rounded-full text-xs font-bold
          ${styles.bg} ${styles.text}
          animate-pulse
        `}>
          {badge}
        </div>)}

      {/* Icon with Gradient Background */}
      <div className="relative z-10 mb-4">
        <div className={`
          w-16 h-16 rounded-xl
          bg-gradient-to-br ${styles.gradient}
          flex items-center justify-center
          text-3xl
          shadow-lg
          group-hover:scale-110 group-hover:rotate-3
          transition-transform duration-300
        `}>
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="relative z-10 text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:${styles.gradient} transition-all duration-300">
        {title}
      </h3>

      {/* Description */}
      <p className="relative z-10 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
        {description}
      </p>

      {/* Hover Arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className={`w-6 h-6 ${styles.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
        </svg>
      </div>

      {/* Gradient Overlay on Hover */}
      <div className={`
        absolute inset-0
        bg-gradient-to-br ${styles.gradient}
        opacity-0 group-hover:opacity-5
        transition-opacity duration-300
        pointer-events-none
      `}/>
    </div>);
    if (onClick) {
        return tileContent;
    }
    return (<link_1.default href={href} className="block">
      {tileContent}
    </link_1.default>);
}
//# sourceMappingURL=DashboardTile.js.map