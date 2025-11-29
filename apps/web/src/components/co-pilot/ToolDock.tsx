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
      whileHover={{ scale: isDragging ? 1 : 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={isDragging ? { opacity: 0.5 } : { opacity: 1 }}
    >
      <div className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {tool.icon}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {(isExpanded || hoveredTool === tool.id) && !isDragging && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute right-full mr-2 top-1/2 -translate-y-1/2 pointer-events-none z-50"
          >
            <div className="bg-gray-900 dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl whitespace-nowrap text-sm">
              <div className="font-semibold">{tool.name}</div>
              <div className="text-xs text-gray-300 mt-1">{tool.description}</div>
              {/* Arrow */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-1">
                <div className="w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45" />
              </div>
            </div>
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

  return (
    <motion.div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex items-center">
        {/* Tool Icons */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-l-2xl shadow-2xl p-2">
          <div className="space-y-2">
            {tools.map((tool) => (
              <DraggableTool
                key={tool.id}
                tool={tool}
                isExpanded={isExpanded}
                hoveredTool={hoveredTool}
                onHover={setHoveredTool}
                onToolSelect={onToolSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

