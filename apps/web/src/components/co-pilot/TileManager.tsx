'use client';

/**
 * Tile Manager
 * Manages tile positions, drag-and-drop, and layouts for the command center
 */

import { useState, ReactNode, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';

export interface TileLayout {
  id: string;
  zone: 'main' | 'side' | 'bottom' | 'floating';
  order: number;
  isMinimized?: boolean;
  isExpanded?: boolean;
}

interface TileManagerProps {
  children: ReactNode;
  initialLayout?: TileLayout[];
  onLayoutChange?: (layout: TileLayout[]) => void;
  className?: string;
}

export default function TileManager({
  children,
  initialLayout = [],
  onLayoutChange,
  className = '',
}: TileManagerProps) {
  const [tileLayouts, setTileLayouts] = useState<TileLayout[]>(initialLayout);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setActiveZone(over.id as string);
    } else {
      setActiveZone(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const activeId = active.id as string;
        const targetZone = over.id as string;

        // Determine if it's a zone or a tile
        const isZone = ['main', 'side', 'bottom', 'floating'].includes(targetZone);

        if (isZone) {
          // Moving to a new zone
          setTileLayouts((layouts) => {
            const newLayouts = layouts.map((layout) =>
              layout.id === activeId
                ? { ...layout, zone: targetZone as TileLayout['zone'] }
                : layout
            );

            if (onLayoutChange) {
              onLayoutChange(newLayouts);
            }

            return newLayouts;
          });
        } else {
          // Reordering within a zone
          setTileLayouts((layouts) => {
            const activeLayout = layouts.find((l) => l.id === activeId);
            const overLayout = layouts.find((l) => l.id === targetZone);

            if (!activeLayout || !overLayout) return layouts;

            const activeIndex = layouts.indexOf(activeLayout);
            const overIndex = layouts.indexOf(overLayout);

            const newLayouts = [...layouts];
            newLayouts[activeIndex] = { ...activeLayout, order: overLayout.order };
            newLayouts[overIndex] = { ...overLayout, order: activeLayout.order };

            if (onLayoutChange) {
              onLayoutChange(newLayouts);
            }

            return newLayouts;
          });
        }
      }

      setActiveId(null);
      setActiveZone(null);
    },
    [onLayoutChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveZone(null);
  }, []);

  const getTilesByZone = (zone: TileLayout['zone']) => {
    return tileLayouts
      .filter((layout) => layout.zone === zone)
      .sort((a, b) => a.order - b.order);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
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

        {/* Main Content */}
        <div className="relative h-full p-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-full">
            {/* Main Zone - 8 columns */}
            <DropZone
              id="main"
              label="Main Command Center"
              isActive={activeZone === 'main'}
              className="lg:col-span-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {children}
              </div>
            </DropZone>

            {/* Side Zone - 4 columns */}
            <DropZone
              id="side"
              label="Side Tools"
              isActive={activeZone === 'side'}
              className="lg:col-span-4"
            >
              <div className="space-y-6">{/* Side content */}</div>
            </DropZone>

            {/* Bottom Zone - Full width */}
            <DropZone
              id="bottom"
              label="Data Views"
              isActive={activeZone === 'bottom'}
              className="lg:col-span-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Bottom content */}
              </div>
            </DropZone>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <motion.div
              initial={{ scale: 1.05, rotate: -2 }}
              animate={{ scale: 1.1, rotate: 2 }}
              transition={{
                rotate: {
                  repeat: Infinity,
                  repeatType: 'reverse',
                  duration: 0.5,
                },
              }}
              className="opacity-80 shadow-2xl"
            >
              <div className="p-6 bg-white rounded-2xl border-2 border-blue-500">
                <div className="text-lg font-semibold text-gray-900">
                  Dragging tile...
                </div>
              </div>
            </motion.div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

/**
 * Drop Zone Component
 */
interface DropZoneProps {
  id: string;
  label: string;
  isActive: boolean;
  children: ReactNode;
  className?: string;
}

function DropZone({ id, label, isActive, children, className = '' }: DropZoneProps) {
  return (
    <motion.div
      layout
      id={id}
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
            ? 'border-blue-500 bg-blue-50/50 shadow-2xl shadow-blue-500/20 scale-[1.02]'
            : 'border-gray-200/50 bg-white/30'
        }
        ${className}
      `}
    >
      {/* Zone Label */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute -top-4 left-6 z-10"
          >
            <div className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-2 h-2 bg-white rounded-full"
              />
              Drop here: {label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className={`p-6 ${isActive ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
        {children}
      </div>

      {/* Corner Indicators with Glow Effect */}
      {isActive && (
        <>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-3 left-3 w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"
          >
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-blue-400 rounded-full"
            />
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-3 right-3 w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"
          >
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
              className="absolute inset-0 bg-blue-400 rounded-full"
            />
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bottom-3 left-3 w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"
          >
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}
              className="absolute inset-0 bg-blue-400 rounded-full"
            />
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bottom-3 right-3 w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"
          >
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.9 }}
              className="absolute inset-0 bg-blue-400 rounded-full"
            />
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
