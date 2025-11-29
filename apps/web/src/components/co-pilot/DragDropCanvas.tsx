'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface DropZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragDropCanvasProps {
  children: React.ReactNode;
  onToolDrop?: (toolId: string, dropZoneId: string) => void;
  dropZones?: DropZone[];
}

export function DragDropCanvas({ children, onToolDrop, dropZones = [] }: DragDropCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  const handleDragOver = (event: DragOverEvent) => {
    if (!event.over) {
      setActiveDropZone(null);
      return;
    }

    // Check if we're over a drop zone
    const overId = event.over.id as string;
    const dropZone = dropZones.find((zone) => zone.id === overId);
    if (dropZone) {
      setActiveDropZone(overId);
    } else {
      setActiveDropZone(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const dropZone = dropZones.find((zone) => zone.id === over.id);
      if (dropZone && onToolDrop) {
        onToolDrop(active.id as string, over.id as string);
      }
    }

    setActiveId(null);
    setActiveDropZone(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div ref={canvasRef} className="relative w-full h-full">
        {children}

        {/* Drop Zone Overlays */}
        <AnimatePresence>
          {activeId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-10"
            >
              {dropZones.map((zone) => (
                <motion.div
                  key={zone.id}
                  className={`absolute border-2 border-dashed rounded-xl ${
                    activeDropZone === zone.id
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/50'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-100/50 dark:bg-gray-800/50'
                  }`}
                  style={{
                    left: `${zone.x}px`,
                    top: `${zone.y}px`,
                    width: `${zone.width}px`,
                    height: `${zone.height}px`,
                  }}
                  animate={
                    activeDropZone === zone.id
                      ? {
                          scale: [1, 1.02, 1],
                          boxShadow: [
                            '0 0 0 0 rgba(59, 130, 246, 0.4)',
                            '0 0 0 8px rgba(59, 130, 246, 0)',
                            '0 0 0 0 rgba(59, 130, 246, 0)',
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DragOverlay>
        {activeId ? (
          <motion.div
            initial={{ opacity: 0.5, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
          >
            Dragging: {activeId}
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
