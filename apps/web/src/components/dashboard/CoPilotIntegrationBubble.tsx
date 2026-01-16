'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface AITool {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  gradient: string;
}

const AI_TOOLS: AITool[] = [
  {
    id: 'scribe',
    name: 'AI Scribe',
    icon: '/icons/i-note_action (1).svg',
    description: 'Voice-to-SOAP transcription',
    color: 'from-purple-500 to-pink-600',
    gradient: 'bg-gradient-to-br from-purple-500/20 to-pink-600/20',
  },
  {
    id: 'cds',
    name: 'CDS',
    icon: '/icons/stethoscope (1).svg',
    description: 'Clinical decision support chat',
    color: 'from-cyan-500 to-blue-600',
    gradient: 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20',
  },
  {
    id: 'risk',
    name: 'Risk Score',
    icon: '/icons/diagnostics (1).svg',
    description: 'Risk stratification',
    color: 'from-amber-500 to-orange-600',
    gradient: 'bg-gradient-to-br from-amber-500/20 to-orange-600/20',
  },
  {
    id: 'prevention',
    name: 'Prevention',
    icon: '/icons/health (1).svg',
    description: 'Preventive plan',
    color: 'from-emerald-500 to-teal-600',
    gradient: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20',
  },
  {
    id: 'labs',
    name: 'Lab Insights',
    icon: '/icons/diagnostics (1).svg',
    description: 'Labs overview',
    color: 'from-indigo-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-indigo-500/20 to-purple-600/20',
  },
  {
    id: 'patient',
    name: 'Patient Overview',
    icon: '/icons/people (1).svg',
    description: 'Demographics, history, vitals, PE',
    color: 'from-slate-500 to-slate-700',
    gradient: 'bg-gradient-to-br from-slate-500/20 to-slate-700/20',
  },
  {
    id: 'dx',
    name: 'Clinical Reasoning',
    icon: '/icons/artificial-intelligence (1).svg',
    description: 'AI-assisted differential + workup',
    color: 'from-rose-500 to-fuchsia-600',
    gradient: 'bg-gradient-to-br from-rose-500/20 to-fuchsia-600/20',
  },
];

interface CoPilotIntegrationBubbleProps {
  onToolSelect?: (toolId: string) => void;
}

export function CoPilotIntegrationBubble({ onToolSelect }: CoPilotIntegrationBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [orderedTools, setOrderedTools] = useState<AITool[]>(AI_TOOLS);

  const getUsage = (toolId: string) => {
    try {
      const raw = window.localStorage.getItem(`holi.toolUsage.${toolId}`);
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  const bumpUsage = (toolId: string) => {
    try {
      const next = getUsage(toolId) + 1;
      window.localStorage.setItem(`holi.toolUsage.${toolId}`, String(next));
    } catch {}
  };

  useEffect(() => {
    // Recompute ordering whenever menu opens (reflects latest usage).
    if (!isOpen) return;
    const sorted = [...AI_TOOLS].sort((a, b) => getUsage(b.id) - getUsage(a.id));
    setOrderedTools(sorted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const calculateBubblePosition = (index: number, total: number, radius: number) => {
    const angle = (index * 360) / total;
    const radians = (angle * Math.PI) / 180;

    return {
      x: Math.cos(radians) * radius,
      y: Math.sin(radians) * radius,
      angle,
    };
  };

  const handleToolClick = (toolId: string) => {
    bumpUsage(toolId);
    if (onToolSelect) {
      onToolSelect(toolId);
    }
    setIsOpen(false);
  };

  const computeCenter = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const radius = Math.max(90, Math.min(130, Math.min(window.innerWidth, window.innerHeight) / 2 - 120));
    const bubbleHalf = 44; // ~ w-20 /2 + slack
    const padding = 16;
    const safe = radius + bubbleHalf + padding;
    const x = Math.min(Math.max(rect.left + rect.width / 2, safe), window.innerWidth - safe);
    const y = Math.min(Math.max(rect.top + rect.height / 2, safe), window.innerHeight - safe);
    return { x, y };
  };

  useEffect(() => {
    if (!isOpen) return;
    const update = () => setCenter(computeCenter());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block z-[60]">
      {/* Central [+] Button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative w-16 h-16 rounded-full
          bg-gradient-to-br from-yellow-500 to-amber-600
          hover:from-yellow-600 hover:to-amber-700
          shadow-lg hover:shadow-2xl
          transition-all duration-300
          flex items-center justify-center
          group
          ${isOpen ? 'scale-110 rotate-45' : 'scale-100 rotate-0'}
        `}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          {/* Pulsing ring */}
          {!isOpen && (
            <motion.div
              className="absolute inset-0 rounded-full bg-yellow-400/30"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}

          <span className="text-3xl font-bold text-white relative z-10 transition-transform duration-300">
            +
          </span>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
            AI Integrations
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45" />
            </div>
          </div>
        </div>
      </motion.button>

      {/* Circular Bubble Menu */}
      <AnimatePresence>
        {isOpen && center && (
          <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Backdrop (no blur; keep UI visible). Click to close. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/5"
              style={{ pointerEvents: 'auto' }}
              onClick={() => setIsOpen(false)}
            />

            <div
              className="absolute"
              style={{ left: center.x, top: center.y, transform: 'translate(-50%, -50%)' }}
            >
              {(() => {
                const radius = Math.max(90, Math.min(130, Math.min(window.innerWidth, window.innerHeight) / 2 - 120));
                return (
                  <>
              {/* Connection lines to center */}
              {orderedTools.map((tool, index) => {
                const pos = calculateBubblePosition(index, orderedTools.length, radius);
                return (
                  <motion.div
                    key={`line-${tool.id}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 0.2, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="absolute top-0 left-0 origin-center pointer-events-none"
                    style={{
                      width: '2px',
                      height: `${Math.sqrt(pos.x * pos.x + pos.y * pos.y)}px`,
                      transform: `rotate(${pos.angle}deg) translate(-50%, 0)`,
                      background: `linear-gradient(to bottom, transparent, rgba(251, 191, 36, 0.3), transparent)`,
                    }}
                  />
                );
              })}

              {/* Tool Bubbles */}
              {orderedTools.map((tool, index) => {
                const pos = calculateBubblePosition(index, orderedTools.length, radius);
                const isHovered = hoveredTool === tool.id;

                return (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    transition={{
                      delay: index * 0.05,
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                    }}
                    className="absolute top-0 left-0 pointer-events-auto"
                    onMouseEnter={() => setHoveredTool(tool.id)}
                    onMouseLeave={() => setHoveredTool(null)}
                  >
                    <motion.button
                      onClick={() => handleToolClick(tool.id)}
                      className={`
                        relative w-20 h-20 rounded-full
                        bg-white dark:bg-gray-800
                        border-2 border-gray-200 dark:border-gray-700
                        shadow-xl hover:shadow-2xl
                        transition-all duration-300
                        flex flex-col items-center justify-center gap-1
                        group
                        ${tool.gradient}
                      `}
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {/* Icon */}
                      <div className="relative w-8 h-8">
                        <Image
                          src={tool.icon}
                          alt={tool.name}
                          width={32}
                          height={32}
                          className="dark:invert"
                        />
                      </div>

                      {/* Tool label (always visible) */}
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[120] pointer-events-none">
                        <div className="bg-gray-900/90 dark:bg-gray-800/90 text-white text-xs px-3 py-2 rounded-lg shadow-2xl text-center w-[120px]">
                          <div className="font-semibold leading-tight">{tool.name}</div>
                          <div className="text-gray-300 text-[10px] leading-tight">{tool.description}</div>
                        </div>
                      </div>

                      {/* Hover glow effect */}
                      {isHovered && (
                        <motion.div
                          layoutId="glow"
                          className={`absolute inset-0 rounded-full bg-gradient-to-br ${tool.color} opacity-30 blur-xl`}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
