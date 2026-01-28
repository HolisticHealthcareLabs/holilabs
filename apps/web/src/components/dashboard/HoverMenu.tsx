'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface HoverMenuProps {
    toolId: string;
    isOpen: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    items: {
        label: string;
        href: string;
        icon?: React.ReactNode;
    }[];
}

export function HoverMenu({ toolId, isOpen, onMouseEnter, onMouseLeave, items }: HoverMenuProps) {
    if (!isOpen && !isOpen) return null;

    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`absolute left-full ml-2 top-0 z-50 transition-all duration-300 origin-left
        ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-2 pointer-events-none'}`}
        >
            <div className="bg-white/10 dark:bg-gray-800/90 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-2 min-w-[200px]">
                <div className="space-y-1">
                    {items.map((item, idx) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all duration-200"
                            style={{ transitionDelay: `${idx * 50}ms` }}
                        >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                {item.icon || <div className="w-1.5 h-1.5 rounded-full bg-white/40" />}
                            </div>
                            <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </div>

                {/* Pointer arrow */}
                <div className="absolute left-[-6px] top-6 w-3 h-3 bg-white/10 dark:bg-gray-800/90 rotate-45 border-l border-b border-white/20" />
            </div>
        </div>
    );
}
