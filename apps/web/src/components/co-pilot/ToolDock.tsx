'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import {
  MicrophoneIcon,
  ShieldCheckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: 'scribe' | 'prevention' | 'risk';
}

const tools: Tool[] = [
  {
    id: 'ai-scribe',
    name: 'AI Scribe',
    icon: <MicrophoneIcon className="w-5 h-5" />,
    description: 'Voice-to-SOAP transcription',
    category: 'scribe',
  },
  {
    id: 'preventive-plan',
    name: 'Preventive Plan',
    icon: <ShieldCheckIcon className="w-5 h-5" />,
    description: 'Generate preventive care plan',
    category: 'prevention',
  },
  {
    id: 'risk-stratification',
    name: 'Risk Stratification',
    icon: <ChartBarIcon className="w-5 h-5" />,
    description: 'Analyze patient risk factors',
    category: 'risk',
  },
];

interface DraggableToolProps {
  tool: Tool;
  isExpanded: boolean;
  hoveredTool: string | null;
  onHover: (id: string | null) => void;
  onToolSelect?: (tool: Tool) => void;
}

function DraggableTool({ tool, isExpanded, hoveredTool, onHover, onToolSelect }: DraggableToolProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tool.id,
    data: {
      type: 'tool',
      tool,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <motion.button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => onHover(tool.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onToolSelect?.(tool)}
      className="relative p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group cursor-grab active:cursor-grabbing"
      style={style}
      whileHover={{ scale: isDragging ? 1 : 1.15, rotate: isDragging ? 0 : [0, -5, 5, 0] }}
      whileTap={{ scale: 0.9 }}
      animate={isDragging ? { opacity: 0.5 } : { opacity: 1 }}
      transition={{ type: 'spring', damping: 15 }}
    >
      <motion.div
        animate={hoveredTool === tool.id ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
      >
        {tool.icon}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {(isExpanded || hoveredTool === tool.id) && !isDragging && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute right-full mr-2 top-1/2 -translate-y-1/2 pointer-events-none z-50"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 10px 30px rgba(0, 0, 0, 0.3)',
                  '0 10px 40px rgba(0, 0, 0, 0.4)',
                  '0 10px 30px rgba(0, 0, 0, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-gray-900 dark:bg-gray-800 text-white px-3 py-2 rounded-lg whitespace-nowrap text-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="font-semibold"
              >
                {tool.name}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs text-gray-300 mt-1"
              >
                {tool.description}
              </motion.div>
              {/* Arrow */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
                className="absolute left-full top-1/2 -translate-y-1/2 -ml-1"
              >
                <div className="w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

interface ToolDockProps {
  onToolSelect?: (tool: Tool) => void;
  patientId?: string;
  transcript?: string;
}

export function ToolDock({ onToolSelect, patientId, transcript }: ToolDockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleExpand = () => {
    setIsExpanded(true);
    setHasInteracted(true);
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.5 }}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[60]"
      onMouseEnter={handleExpand}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Pulsing indicator when not yet interacted */}
      {!hasInteracted && !isExpanded && (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full pointer-events-none"
        />
      )}

      <motion.div
        animate={isExpanded ? { x: 0 } : { x: 8 }}
        transition={{ type: 'spring', damping: 20 }}
        className="flex items-center"
      >
        {/* Tool Icons */}
        <motion.div
          animate={isExpanded ? {
            boxShadow: [
              '0 20px 60px rgba(0, 0, 0, 0.15)',
              '0 20px 80px rgba(0, 0, 0, 0.2)',
              '0 20px 60px rgba(0, 0, 0, 0.15)',
            ],
          } : {}}
          transition={{ duration: 2, repeat: isExpanded ? Infinity : 0 }}
          className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-l-2xl shadow-2xl p-2"
        >
          <div className="space-y-2">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1, type: 'spring', damping: 20 }}
              >
                <DraggableTool
                  tool={tool}
                  isExpanded={isExpanded}
                  hoveredTool={hoveredTool}
                  onHover={setHoveredTool}
                  onToolSelect={onToolSelect}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

