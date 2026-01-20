'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Download,
  Info,
  Contrast,
  Sun,
  Move,
  Ruler,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Grid3X3,
} from 'lucide-react';

export interface DicomViewerProps {
  studyId: string;
  studyInstanceUID?: string;
  patientName?: string;
  modality?: string;
  bodyPart?: string;
  studyDate?: string;
  imageCount?: number;
  onClose?: () => void;
}

interface ViewportSettings {
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  rotation: number;
  invert: boolean;
  pan: { x: number; y: number };
}

const DEFAULT_VIEWPORT: ViewportSettings = {
  windowWidth: 400,
  windowCenter: 40,
  zoom: 1,
  rotation: 0,
  invert: false,
  pan: { x: 0, y: 0 },
};

// Window/Level presets for different modalities
const WL_PRESETS: Record<string, { ww: number; wc: number; name: string }[]> = {
  CT: [
    { ww: 400, wc: 40, name: 'Soft Tissue' },
    { ww: 1500, wc: -600, name: 'Lung' },
    { ww: 2500, wc: 480, name: 'Bone' },
    { ww: 80, wc: 40, name: 'Brain' },
    { ww: 350, wc: 50, name: 'Liver' },
  ],
  MR: [
    { ww: 600, wc: 300, name: 'Default' },
    { ww: 1200, wc: 600, name: 'T1' },
    { ww: 800, wc: 400, name: 'T2' },
  ],
  XR: [
    { ww: 4096, wc: 2048, name: 'Default' },
    { ww: 2048, wc: 1024, name: 'Chest' },
  ],
  US: [
    { ww: 255, wc: 128, name: 'Default' },
  ],
};

type Tool = 'pan' | 'zoom' | 'window' | 'measure';

export function DicomViewer({
  studyId,
  studyInstanceUID,
  patientName,
  modality = 'CT',
  bodyPart,
  studyDate,
  imageCount = 1,
  onClose,
}: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportSettings>(DEFAULT_VIEWPORT);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('window');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dicomUrl, setDicomUrl] = useState<string | null>(null);

  // Fetch DICOM from WADO-RS
  const fetchDicom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const uid = studyInstanceUID || studyId;
      const response = await fetch(`/api/dicomweb/wado/studies/${uid}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load DICOM study');
      }

      const data = await response.json();
      if (data.url) {
        setDicomUrl(data.url);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studyId, studyInstanceUID]);

  useEffect(() => {
    fetchDicom();
  }, [fetchDicom]);

  // Render viewport to canvas (placeholder - in production would use dcmjs/Cornerstone)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (loading) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading DICOM...', canvas.width / 2, canvas.height / 2);
      return;
    }

    if (error) {
      ctx.fillStyle = '#f00';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(error, canvas.width / 2, canvas.height / 2);
      return;
    }

    // Apply transforms
    ctx.save();
    ctx.translate(canvas.width / 2 + viewport.pan.x, canvas.height / 2 + viewport.pan.y);
    ctx.rotate((viewport.rotation * Math.PI) / 180);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Placeholder for actual DICOM rendering
    ctx.fillStyle = '#1a1a2e';
    const size = Math.min(canvas.width, canvas.height) * 0.6;
    ctx.fillRect(-size / 2, -size / 2, size, size);

    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DICOM Viewer', 0, -size / 4);
    ctx.fillText(`Study: ${studyInstanceUID || studyId}`, 0, 0);
    ctx.fillText(`Frame: ${currentFrame + 1}/${imageCount}`, 0, size / 4);

    if (dicomUrl) {
      ctx.fillStyle = '#0f0';
      ctx.fillText('DICOM loaded', 0, size / 3);
    }

    ctx.restore();

    // Overlay info
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`W: ${viewport.windowWidth} C: ${viewport.windowCenter}`, 10, 20);
    ctx.fillText(`Zoom: ${(viewport.zoom * 100).toFixed(0)}%`, 10, 35);
    ctx.textAlign = 'right';
    ctx.fillText(modality, canvas.width - 10, 20);
    ctx.fillText(bodyPart || '', canvas.width - 10, 35);
  }, [viewport, loading, error, dicomUrl, currentFrame, imageCount, studyId, studyInstanceUID, modality, bodyPart]);

  // Mouse interaction handlers
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    switch (activeTool) {
      case 'pan':
        setViewport((v) => ({ ...v, pan: { x: v.pan.x + dx, y: v.pan.y + dy } }));
        break;
      case 'zoom':
        setViewport((v) => ({ ...v, zoom: Math.max(0.1, Math.min(10, v.zoom + dy * -0.01)) }));
        break;
      case 'window':
        setViewport((v) => ({
          ...v,
          windowWidth: Math.max(1, v.windowWidth + dx * 2),
          windowCenter: v.windowCenter + dy,
        }));
        break;
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'r':
          setViewport(DEFAULT_VIEWPORT);
          break;
        case 'i':
          setViewport((v) => ({ ...v, invert: !v.invert }));
          break;
        case 'ArrowLeft':
          setCurrentFrame((f) => Math.max(0, f - 1));
          break;
        case 'ArrowRight':
          setCurrentFrame((f) => Math.min(imageCount - 1, f + 1));
          break;
        case ' ':
          setIsPlaying((p) => !p);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageCount]);

  // Auto-play frames (cine mode)
  useEffect(() => {
    if (!isPlaying || imageCount <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrame((f) => (f + 1) % imageCount);
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, imageCount]);

  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const presets = WL_PRESETS[modality] || WL_PRESETS.CT;

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <span className="font-semibold">{patientName || 'Unknown'}</span>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-400">{modality} - {bodyPart}</span>
          <span className="text-sm text-gray-400">{studyDate}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded ${showMetadata ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Show Metadata"
          >
            <Info className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        {/* Tool selection */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTool('pan')}
            className={`p-2 rounded ${activeTool === 'pan' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Pan (drag)"
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('zoom')}
            className={`p-2 rounded ${activeTool === 'zoom' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Zoom (drag up/down)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('window')}
            className={`p-2 rounded ${activeTool === 'window' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Window/Level (drag)"
          >
            <Contrast className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('measure')}
            className={`p-2 rounded ${activeTool === 'measure' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Measure"
          >
            <Ruler className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-600 mx-2" />

          {/* Window presets */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="p-2 rounded hover:bg-gray-700 flex items-center"
              title="Window Presets"
            >
              <Grid3X3 className="w-4 h-4 mr-1" />
              <span className="text-xs">Presets</span>
            </button>
            {showPresets && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setViewport((v) => ({ ...v, windowWidth: preset.ww, windowCenter: preset.wc }));
                      setShowPresets(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm whitespace-nowrap"
                  >
                    {preset.name} (W:{preset.ww} C:{preset.wc})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setViewport((v) => ({ ...v, rotation: (v.rotation + 90) % 360 }))}
            className="p-2 rounded hover:bg-gray-700"
            title="Rotate 90"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport((v) => ({ ...v, invert: !v.invert }))}
            className={`p-2 rounded ${viewport.invert ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Invert"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport(DEFAULT_VIEWPORT)}
            className="p-2 rounded hover:bg-gray-700"
            title="Reset (R)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-gray-700"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {dicomUrl && (
            <a
              href={dicomUrl}
              download
              className="p-2 rounded hover:bg-gray-700"
              title="Download DICOM"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main viewer area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Metadata panel */}
        {showMetadata && (
          <div className="w-72 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Study Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Study ID:</span>
                <p className="font-mono text-xs break-all">{studyId}</p>
              </div>
              {studyInstanceUID && (
                <div>
                  <span className="text-gray-400">Study Instance UID:</span>
                  <p className="font-mono text-xs break-all">{studyInstanceUID}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400">Modality:</span>
                <p>{modality}</p>
              </div>
              <div>
                <span className="text-gray-400">Body Part:</span>
                <p>{bodyPart || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-gray-400">Study Date:</span>
                <p>{studyDate || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-gray-400">Images:</span>
                <p>{imageCount}</p>
              </div>
              <hr className="border-gray-700 my-4" />
              <div>
                <span className="text-gray-400">Window Width:</span>
                <p>{viewport.windowWidth}</p>
              </div>
              <div>
                <span className="text-gray-400">Window Center:</span>
                <p>{viewport.windowCenter}</p>
              </div>
              <div>
                <span className="text-gray-400">Zoom:</span>
                <p>{(viewport.zoom * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frame navigation (for multi-frame) */}
      {imageCount > 1 && (
        <div className="flex items-center justify-center px-4 py-2 bg-gray-900 border-t border-gray-700">
          <button
            onClick={() => setCurrentFrame((f) => Math.max(0, f - 1))}
            className="p-2 rounded hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 mx-2 rounded ${isPlaying ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setCurrentFrame((f) => Math.min(imageCount - 1, f + 1))}
            className="p-2 rounded hover:bg-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-4 text-sm text-gray-400">
            Frame {currentFrame + 1} / {imageCount}
          </span>
          <input
            type="range"
            min={0}
            max={imageCount - 1}
            value={currentFrame}
            onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
            className="ml-4 w-48"
          />
        </div>
      )}
    </div>
  );
}

export default DicomViewer;
