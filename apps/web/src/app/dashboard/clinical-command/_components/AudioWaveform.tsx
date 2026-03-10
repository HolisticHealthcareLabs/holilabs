'use client';

import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  volume: number; // 0 to 1
}

export function AudioWaveform({ isRecording, volume }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Create an array of bar heights for the visualizer
  const barsRef = useRef<number[]>(Array.from({ length: 20 }, () => 0.1));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const barCount = barsRef.current.length;
      const barWidth = (width / barCount) - 2;
      
      // Update bars based on current volume and some randomness for natural feel
      if (isRecording) {
        barsRef.current = barsRef.current.map((currentHeight, i) => {
          // Center bars react more to volume, outer bars less
          const distanceFromCenter = Math.abs((i - barCount / 2) / (barCount / 2));
          const volumeInfluence = Math.max(0, 1 - distanceFromCenter) * volume;
          
          // Add some jitter
          const jitter = Math.random() * 0.1;
          
          // Target height is a mix of volume influence and jitter
          const targetHeight = Math.max(0.05, Math.min(1, volumeInfluence * 1.5 + jitter));
          
          // Smoothly interpolate to target height
          return currentHeight + (targetHeight - currentHeight) * 0.2;
        });
      } else {
        // Smoothly return to flat line when not recording
        barsRef.current = barsRef.current.map(h => h + (0.05 - h) * 0.1);
      }

      // Draw bars
      barsRef.current.forEach((barHeight, i) => {
        const x = i * (barWidth + 2);
        const actualHeight = barHeight * height;
        const y = (height - actualHeight) / 2; // Center vertically
        
        ctx.fillStyle = isRecording ? '#ef4444' : '#9ca3af'; // Red when recording, gray when stopped
        
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, actualHeight, barWidth / 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, volume]);

  return (
    <div className="flex items-center justify-center h-8 w-32">
      <canvas 
        ref={canvasRef} 
        width={128} 
        height={32} 
        className="w-full h-full"
      />
    </div>
  );
}
