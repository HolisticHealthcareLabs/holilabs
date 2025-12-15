'use client';

import { useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';

interface LoadingScreenProps {
  onComplete?: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Play video when component mounts
    if (videoRef.current) {
      // Set volume to ensure audio plays
      videoRef.current.volume = 1.0;

      // Attempt to play with audio
      videoRef.current.play().catch((error) => {
        logger.error({
          event: 'loading_video_play_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // If autoplay with audio fails (browser policy), try muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch((e) => {
            logger.error({
              event: 'loading_video_muted_play_error',
              error: e instanceof Error ? e.message : 'Unknown error'
            });
          });
        }
      });
    }
  }, []);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    // Wait a bit before calling onComplete to allow fade out
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-500 ${
        videoEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Blurred UI Preview Background */}
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900">
        {/* Blurred Dashboard Preview */}
        <div className="absolute inset-0 blur-2xl opacity-30">
          {/* Header blur */}
          <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" />

          {/* Sidebar blur */}
          <div className="absolute left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <div className="p-4 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-gradient-to-br from-blue-400/40 to-purple-500/40 rounded-full"
                />
              ))}
            </div>
          </div>

          {/* Main content blur */}
          <div className="ml-64 pt-16 p-6 space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-white/50 dark:bg-gray-800/50 rounded-lg"
                />
              ))}
            </div>

            {/* Large content area */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 h-96 bg-white/50 dark:bg-gray-800/50 rounded-lg" />
              <div className="h-96 bg-white/50 dark:bg-gray-800/50 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Video Container - Fullscreen with crop */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50/80 via-purple-50/80 to-pink-50/80 dark:from-gray-900/80 dark:via-gray-800/80 dark:to-gray-900/80 backdrop-blur-xl overflow-hidden">
        {/* Video - Fullscreen and cropped to hide VEO watermark */}
        <div className="relative w-full h-full flex items-center justify-center">
          <video
            ref={videoRef}
            className="min-w-full min-h-full object-cover scale-110"
            style={{
              objectPosition: 'center center',
              transform: 'scale(1.15) translateY(-2%)'
            }}
            onEnded={handleVideoEnd}
            playsInline
            preload="auto"
            muted={false}
          >
            <source src="/loading-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Mask to hide bottom right corner (VEO watermark) */}
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-gray-900/100 via-gray-900/80 to-transparent dark:from-black/100 dark:via-black/80" />
        </div>
      </div>

      {/* Skip button (optional - appears after 3 seconds) */}
      <button
        onClick={() => {
          setVideoEnded(true);
          if (onComplete) {
            onComplete();
          }
        }}
        className="absolute bottom-8 right-8 px-6 py-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:scale-105 opacity-0 animate-fadeIn"
        style={{ animationDelay: '3s', animationFillMode: 'forwards' }}
      >
        Skip
      </button>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in;
        }
      `}</style>
    </div>
  );
}
