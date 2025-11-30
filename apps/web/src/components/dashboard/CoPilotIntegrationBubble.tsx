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
    description: 'Real-time clinical documentation',
    color: 'from-purple-500 to-pink-600',
    gradient: 'bg-gradient-to-br from-purple-500/20 to-pink-600/20',
  },
  {
    id: 'diagnosis',
    name: 'Diagnosis AI',
    icon: '/icons/stethoscope (1).svg',
    description: 'Differential diagnosis assistant',
    color: 'from-cyan-500 to-blue-600',
    gradient: 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20',
  },
  {
    id: 'imaging',
    name: 'Image Analysis',
    icon: '/icons/diagnostics (1).svg',
    description: 'AI-powered radiology insights',
    color: 'from-indigo-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-indigo-500/20 to-purple-600/20',
  },
  {
    id: 'prevention',
    name: 'Prevention Hub',
    icon: '/icons/health (1).svg',
    description: 'Preventive care protocols',
    color: 'from-emerald-500 to-teal-600',
    gradient: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20',
  },
  {
    id: 'prescribe',
    name: 'Smart Rx',
    icon: '/icons/rx (1).svg',
    description: 'Intelligent prescribing',
    color: 'from-orange-500 to-red-600',
    gradient: 'bg-gradient-to-br from-orange-500/20 to-red-600/20',
  },
  {
    id: 'research',
    name: 'Evidence Search',
    icon: '/icons/forum (1).svg',
    description: 'Latest clinical evidence',
    color: 'from-blue-500 to-cyan-600',
    gradient: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20',
  },
  {
    id: 'lab-analysis',
    name: 'Lab Insights',
    icon: '/icons/diagnostics (1).svg',
    description: 'Automated lab interpretation',
    color: 'from-fuchsia-500 to-pink-600',
    gradient: 'bg-gradient-to-br from-fuchsia-500/20 to-pink-600/20',
  },
  {
    id: 'patient-education',
    name: 'Patient Ed',
    icon: '/icons/health-worker_form (1).svg',
    description: 'Auto-generate materials',
    color: 'from-amber-500 to-orange-600',
    gradient: 'bg-gradient-to-br from-amber-500/20 to-orange-600/20',
  },
];

interface CoPilotIntegrationBubbleProps {
  onToolSelect?: (toolId: string) => void;
}

export function CoPilotIntegrationBubble({ onToolSelect }: CoPilotIntegrationBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const calculateBubblePosition = (index: number, total: number) => {
    const angle = (index * 360) / total;
    const radius = 140; // Distance from center
    const radians = (angle * Math.PI) / 180;

    return {
      x: Math.cos(radians) * radius,
      y: Math.sin(radians) * radius,
      angle,
    };
  };

  const handleToolClick = (toolId: string) => {
    if (onToolSelect) {
      onToolSelect(toolId);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Central [+] Button */}
      <motion.button
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
        {isOpen && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
              style={{ pointerEvents: 'auto' }}
            />

            {/* Connection lines to center */}
            {AI_TOOLS.map((tool, index) => {
              const pos = calculateBubblePosition(index, AI_TOOLS.length);
              return (
                <motion.div
                  key={`line-${tool.id}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 0.2, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="absolute top-1/2 left-1/2 origin-center pointer-events-none"
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
            {AI_TOOLS.map((tool, index) => {
              const pos = calculateBubblePosition(index, AI_TOOLS.length);
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
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
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

                    {/* Tool name (only on hover) */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50"
                        >
                          <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-2xl">
                            <div className="font-semibold mb-0.5">{tool.name}</div>
                            <div className="text-gray-400 text-[10px]">{tool.description}</div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px]">
                              <div className="w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

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
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
