'use client';

/**
 * Command Center Grid
 * Modular grid layout with drop zones for the futuristic command center
 */

import { ReactNode, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';

interface DropZone {
  id: string;
  label: string;
  position: 'main' | 'side' | 'bottom';
  maxItems?: number;
}

interface CommandCenterGridProps {
  children: ReactNode;
  onTileMove?: (tileId: string, fromZone: string, toZone: string) => void;
  dropZones?: DropZone[];
  className?: string;
}

const defaultDropZones: DropZone[] = [
  { id: 'main-center', label: 'Main Command Center', position: 'main', maxItems: 4 },
  { id: 'side-panel', label: 'Side Tools', position: 'side', maxItems: 3 },
  { id: 'bottom-panel', label: 'Data Views', position: 'bottom', maxItems: 2 },
];

export default function CommandCenterGrid({
  children,
  onTileMove,
  dropZones = defaultDropZones,
  className = '',
}: CommandCenterGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const fromZone = 'current'; // Would track this in state
      const toZone = over.id as string;

      if (onTileMove) {
        onTileMove(active.id as string, fromZone, toZone);
      }
    }

    setActiveId(null);
    setActiveDropZone(null);
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (over) {
      setActiveDropZone(over.id as string);
    } else {
      setActiveDropZone(null);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div
        className={`
          h-full
          bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30
          relative
          overflow-hidden
          ${className}
        `}
      >
        {/* Futuristic Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(59, 130, 246) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(59, 130, 246) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Main Grid Layout */}
        <div className="relative h-full p-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-full">
            {/* Main Command Center (8 columns) */}
            <div className="lg:col-span-8 space-y-6">
              <DropZoneArea
                id="main-center"
                label="Main Command Center"
                isActive={activeDropZone === 'main-center'}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {children}
                </div>
              </DropZoneArea>
            </div>

            {/* Side Panel (4 columns) */}
            <div className="lg:col-span-4 space-y-6">
              <DropZoneArea
                id="side-panel"
                label="Side Tools"
                isActive={activeDropZone === 'side-panel'}
              >
                <div className="space-y-6">
                  {/* Side panel content */}
                </div>
              </DropZoneArea>
            </div>

            {/* Bottom Panel (Full width) */}
            <div className="lg:col-span-12">
              <DropZoneArea
                id="bottom-panel"
                label="Data Views"
                isActive={activeDropZone === 'bottom-panel'}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Bottom panel content */}
                </div>
              </DropZoneArea>
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <motion.div
              initial={{ scale: 1.05 }}
              animate={{ scale: 1.1 }}
              className="opacity-80"
            >
              {/* Dragged item preview */}
            </motion.div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

/**
 * Drop Zone Area Component
 */
interface DropZoneAreaProps {
  id: string;
  label: string;
  isActive: boolean;
  children: ReactNode;
}

function DropZoneArea({ id, label, isActive, children }: DropZoneAreaProps) {
  return (
    <motion.div
      layout
      className={`
        relative
        min-h-[200px]
        rounded-2xl
        border-2
        border-dashed
        transition-all
        duration-300
        ${
          isActive
            ? 'border-blue-500 bg-blue-50/50 shadow-2xl shadow-blue-500/20'
            : 'border-gray-200 bg-white/50'
        }
      `}
    >
      {/* Zone Label */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-3 left-6 z-10"
          >
            <div className="px-4 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full shadow-lg">
              {label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="p-6">
        {children}
      </div>

      {/* Corner Indicators */}
      {isActive && (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 left-2 w-3 h-3 bg-blue-500 rounded-full"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-2 left-2 w-3 h-3 bg-blue-500 rounded-full"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-2 right-2 w-3 h-3 bg-blue-500 rounded-full"
          />
        </>
      )}
    </motion.div>
  );
}
