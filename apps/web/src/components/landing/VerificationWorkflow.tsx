'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const PREFILLED_PROGRESS = 70;

type StepState = 'done' | 'active' | 'queued';

function StatusChip({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Data ingested
      </span>
    );
  }

  if (state === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
        Awaiting verification
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/50 bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-300">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
      Ready when verified
    </span>
  );
}

export function VerificationWorkflow() {
  const [progress, setProgress] = useState(PREFILLED_PROGRESS);
  const [showToast, setShowToast] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(9);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playSimulation = () => {
    setProgress(100);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timeoutRef.current = setTimeout(() => setShowToast(true), 380);
  };

  const resetSimulation = () => {
    setProgress(PREFILLED_PROGRESS);
    setShowToast(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setSecondsLeft(9);
  };

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setSecondsLeft((previous) => (previous <= 1 ? 9 : previous - 1));
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return (
    <motion.div
      onHoverStart={playSimulation}
      onHoverEnd={resetSimulation}
      className="relative rounded-2xl sm:rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:p-6 md:p-8 backdrop-blur-md"
    >
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs font-medium text-zinc-300">
          <span>Verification flow progress</span>
          <span className="text-zinc-400">{progress}% complete - 1 click left</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800/70">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-xl sm:rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 sm:p-5"
        >
          <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">Smart Context</h3>
            <StatusChip state="done" />
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
            EHR data, labs, and meds are already extracted and normalized by AI.
          </p>
          <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-xs text-emerald-300">
            <motion.span
              className="h-2 w-2 rounded-full bg-emerald-400"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            EHR Data ready
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.45,
            delay: 0.05,
            boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 0.2 },
          }}
          className="rounded-xl sm:rounded-2xl border border-blue-400/35 bg-blue-500/10 p-4 sm:p-5"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(59,130,246,0.18)',
              '0 0 0 8px rgba(59,130,246,0.06)',
              '0 0 0 0 rgba(59,130,246,0.18)',
            ],
          }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">Verify Considerations</h3>
            <StatusChip state="active" />
          </div>
          <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="whitespace-nowrap">Expires in {secondsLeft}s</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
            Cortex drafted the logic checks. You just confirm the rationale and finish.
          </p>
          <p className="mt-2 text-xs font-medium tracking-wide text-blue-200/90">Only one action remaining.</p>
          <motion.button
            type="button"
            onClick={playSimulation}
            whileHover={{ y: -1, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              y: [0, -1, 0],
              boxShadow: [
                '0 0 0 0 rgba(59,130,246,0.0)',
                '0 8px 24px -10px rgba(59,130,246,0.7)',
                '0 0 0 0 rgba(59,130,246,0.0)',
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-3 sm:mt-4 inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-blue-300/35 bg-blue-500/20 px-4 py-2.5 text-xs sm:text-sm font-semibold text-blue-100 hover:bg-blue-500/30"
          >
            Confirm Rationale
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="rounded-xl sm:rounded-2xl border border-zinc-500/50 bg-zinc-800/30 p-4 sm:p-5"
        >
          <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">Document &amp; Coordinate</h3>
            <StatusChip state="queued" />
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
            Audit note, documentation, and follow-up actions are queued automatically.
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute bottom-3 sm:bottom-4 right-3 sm:right-4 rounded-lg border border-emerald-400/35 bg-emerald-500/20 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-emerald-100"
          >
            <span className="hidden sm:inline">Documentation generated - care team notified</span>
            <span className="sm:hidden">Success!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
