'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';

interface PulseTooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  showOnMount?: boolean;
  delay?: number;
}

export function PulseTooltip({
  children,
  content,
  side = 'top',
  showOnMount = false,
  delay = 0,
}: PulseTooltipProps) {
  const [isOpen, setIsOpen] = useState(showOnMount);

  useEffect(() => {
    if (showOnMount) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [showOnMount, delay]);

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <div className="inline-block">{children}</div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          sideOffset={8}
          className="z-50 max-w-xs"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <motion.div
            className="bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 rounded-lg shadow-xl text-sm relative backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: [1, 1.02, 1],
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              opacity: { duration: 0.2 },
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          >
            {content}
            <Popover.Arrow className="fill-gray-900 dark:fill-gray-800" />
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
