'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type TutorialStep = {
    id: string;
    targetId: string;
    title: string;
    content: string;
    placement: 'top' | 'bottom' | 'left' | 'right';
};

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'context',
        targetId: 'demo-patient-context',
        title: 'Instant Context Ingestion',
        content: 'Cortex slings unstructured EMR data into a unified clinical context in milliseconds. No manual data entry required.',
        placement: 'bottom',
    },
    {
        id: 'evaluate',
        targetId: 'demo-run-evaluation',
        title: 'Real-Time Evaluation',
        content: 'When a clinician is about to sign an order or note, Cortex evaluates thousands of rules silently in the background.',
        placement: 'top',
    },
];

interface SpotlightTutorialProps {
    isActive: boolean;
    onComplete: () => void;
}

export function SpotlightTutorial({ isActive, onComplete }: SpotlightTutorialProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const step = TUTORIAL_STEPS[currentStepIndex];

    useEffect(() => {
        if (!isActive || !step) return;

        const updateRect = () => {
            const el = document.getElementById(step.targetId);
            if (el) {
                setTargetRect(el.getBoundingClientRect());
                // Scroll into view with some padding
                const y = el.getBoundingClientRect().top + window.scrollY - 150;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        };

        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);

        // Add a slight delay to allow layout changes
        const timeout = setTimeout(updateRect, 300);

        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect);
            clearTimeout(timeout);
        };
    }, [isActive, step]);

    if (!isActive) return null;

    const handleNext = () => {
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
        } else {
            onComplete();
            setCurrentStepIndex(0); // Reset for next time
        }
    };

    const popoverPosition = getPopoverPosition(targetRect, step?.placement || 'bottom');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4"
                style={{
                    background: 'rgba(0, 0, 0, 0.4)', // Dim background to make spotlight pop
                    backdropFilter: 'blur(2px)', // Subtle blur 
                }}
            >
                {/* We use an SVG mask to create a true hole in the overlay.
            Framer motion layout animations animate the path of the mask smoothly. */}

                {/* Tooltip Content aligned dynamically based on the target rect if needed or centered */}
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative z-[60] border border-[#f5f5f7]"
                >
                    <div className="flex items-center gap-3 mb-5 text-[#0071e3]">
                        <span className="w-8 h-8 rounded-full bg-[#0071e3]/10 flex items-center justify-center text-sm font-bold">
                            {currentStepIndex + 1}
                        </span>
                        <h3 className="text-xl font-bold text-[#1d1d1f] tracking-tight">{step.title}</h3>
                    </div>

                    <p className="text-[15px] leading-relaxed text-[#515154] mb-8 font-medium">
                        {step.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-[#f5f5f7] pt-4">
                        <div className="flex gap-1">
                            {TUTORIAL_STEPS.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStepIndex ? 'w-4 bg-[#0071e3]' : 'w-1.5 bg-[#e5e5ea]'
                                        }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={handleNext}
                            className="bg-[#0071e3] text-white px-6 py-2.5 rounded-full font-semibold text-[14px] hover:bg-[#0077ed] active:scale-95 transition-all shadow-[0_4px_16px_rgba(0,113,227,0.2)]"
                        >
                            {currentStepIndex === TUTORIAL_STEPS.length - 1 ? 'Start Demo' : 'Next Step'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function getPopoverPosition(rect: DOMRect | null, placement: 'top' | 'bottom' | 'left' | 'right') {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const gap = 30; // Distance from target
    // Simplified positioning for now, assuming centered popover layout 
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
}
