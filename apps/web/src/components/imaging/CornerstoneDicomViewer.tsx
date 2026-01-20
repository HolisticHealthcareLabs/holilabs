/**
 * Cornerstone DICOM Viewer
 *
 * Production-ready DICOM viewer using Cornerstone3D.
 * Features: Window/Level, Pan, Zoom, Scroll, Measurements, Annotations
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  Info,
  Contrast,
  Move,
  Ruler,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Circle,
  Square,
  CornerDownRight,
  X,
  Crosshair,
} from 'lucide-react';

export interface CornerstoneDicomViewerProps {
  studyId: string;
  studyInstanceUID?: string;
  patientName?: string;
  modality?: string;
  bodyPart?: string;
  studyDate?: string;
  imageUrls?: string[];
  onClose?: () => void;
}

type ToolName =
  | 'WindowLevel'
  | 'Pan'
  | 'Zoom'
  | 'StackScroll'
  | 'Length'
  | 'Probe'
  | 'RectangleROI'
  | 'EllipticalROI'
  | 'Angle';

interface ViewerState {
  currentImageIndex: number;
  totalImages: number;
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  isPlaying: boolean;
  isFullscreen: boolean;
  showMetadata: boolean;
  activeTool: ToolName;
  isLoading: boolean;
  error: string | null;
}

const TOOL_ICONS: Record<ToolName, React.ReactNode> = {
  WindowLevel: <Contrast className="w-4 h-4" />,
  Pan: <Move className="w-4 h-4" />,
  Zoom: <ZoomIn className="w-4 h-4" />,
  StackScroll: <ChevronLeft className="w-4 h-4 rotate-90" />,
  Length: <Ruler className="w-4 h-4" />,
  Probe: <Crosshair className="w-4 h-4" />,
  RectangleROI: <Square className="w-4 h-4" />,
  EllipticalROI: <Circle className="w-4 h-4" />,
  Angle: <CornerDownRight className="w-4 h-4" />,
};

export function CornerstoneDicomViewer({
  studyId,
  studyInstanceUID,
  patientName,
  modality = 'CT',
  bodyPart,
  studyDate,
  imageUrls = [],
  onClose,
}: CornerstoneDicomViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const renderingEngineRef = useRef<any>(null);
  const viewportIdRef = useRef<string>(`viewport-${studyId}`);
  const toolGroupIdRef = useRef<string>(`toolGroup-${studyId}`);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<ViewerState>({
    currentImageIndex: 0,
    totalImages: imageUrls.length || 1,
    windowWidth: 400,
    windowCenter: 40,
    zoom: 1,
    isPlaying: false,
    isFullscreen: false,
    showMetadata: false,
    activeTool: 'WindowLevel',
    isLoading: true,
    error: null,
  });

  const [presets, setPresets] = useState<
    Array<{ name: string; windowWidth: number; windowCenter: number }>
  >([]);

  // Initialize Cornerstone and load images
  useEffect(() => {
    let isMounted = true;

    const initViewer = async () => {
      if (!viewportRef.current) return;

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Dynamic import to avoid SSR issues
        const { initCornerstone, getPresetsForModality } =
          await import('@/lib/imaging/cornerstone-init');
        const cornerstone = await import('@cornerstonejs/core');
        const cornerstoneTools = await import('@cornerstonejs/tools');

        // Initialize Cornerstone
        await initCornerstone();

        // Get presets for this modality
        const modalityPresets = getPresetsForModality(modality);
        if (isMounted) {
          setPresets(modalityPresets);
        }

        // Create rendering engine
        const renderingEngineId = `engine-${studyId}`;
        const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);
        renderingEngineRef.current = renderingEngine;

        // Create viewport
        const viewportInput = {
          viewportId: viewportIdRef.current,
          type: cornerstone.Enums.ViewportType.STACK,
          element: viewportRef.current,
          defaultOptions: {
            background: [0, 0, 0] as [number, number, number],
          },
        };

        renderingEngine.enableElement(viewportInput);

        // Create tool group
        const toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(
          toolGroupIdRef.current
        );

        if (toolGroup) {
          // Add tools to group
          toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
          toolGroup.addTool(cornerstoneTools.PanTool.toolName);
          toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
          toolGroup.addTool(cornerstoneTools.StackScrollTool.toolName);
          toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
          toolGroup.addTool(cornerstoneTools.ProbeTool.toolName);
          toolGroup.addTool(cornerstoneTools.RectangleROITool.toolName);
          toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
          toolGroup.addTool(cornerstoneTools.AngleTool.toolName);

          // Add viewport to tool group
          toolGroup.addViewport(viewportIdRef.current, renderingEngineId);

          // Set default active tool
          toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
          });

          // Enable scroll tool on mouse wheel
          toolGroup.setToolActive(cornerstoneTools.StackScrollTool.toolName, {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
          });
        }

        // Load images
        const uid = studyInstanceUID || studyId;
        const baseUrl = window.location.origin;

        // Fetch presigned URLs for images
        let imageIdsToLoad: string[] = [];

        if (imageUrls.length > 0) {
          // Use provided image URLs directly with wadouri scheme
          imageIdsToLoad = imageUrls.map(
            (url, idx) => `wadouri:${baseUrl}/api/dicomweb/wado/studies/${uid}/instances/${idx}`
          );
        } else {
          // Fetch from WADO endpoint to get URLs
          const response = await fetch(`/api/dicomweb/wado/studies/${uid}`, {
            headers: { Accept: 'application/json' },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.url) {
              imageIdsToLoad = [`wadouri:${data.url}`];
            }
          }

          // Fallback: create single image ID
          if (imageIdsToLoad.length === 0) {
            imageIdsToLoad = [`wadouri:${baseUrl}/api/dicomweb/wado/studies/${uid}`];
          }
        }

        // Get the stack viewport
        const viewport = renderingEngine.getViewport(
          viewportIdRef.current
        ) as any;

        if (viewport && imageIdsToLoad.length > 0) {
          await viewport.setStack(imageIdsToLoad);
          viewport.render();

          if (isMounted) {
            setState((prev) => ({
              ...prev,
              totalImages: imageIdsToLoad.length,
              isLoading: false,
            }));
          }
        }
      } catch (error: any) {
        console.error('Failed to initialize DICOM viewer:', error);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error.message || 'Failed to load DICOM images',
          }));
        }
      }
    };

    initViewer();

    return () => {
      isMounted = false;

      // Cleanup
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }

      // Destroy tool group
      import('@cornerstonejs/tools').then((cornerstoneTools) => {
        cornerstoneTools.ToolGroupManager.destroyToolGroup(toolGroupIdRef.current);
      });

      // Destroy rendering engine
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy();
      }
    };
  }, [studyId, studyInstanceUID, modality, imageUrls]);

  // Set active tool
  const setActiveTool = useCallback(async (toolName: ToolName) => {
    const cornerstoneTools = await import('@cornerstonejs/tools');
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(
      toolGroupIdRef.current
    );

    if (toolGroup) {
      // Deactivate previous tool
      toolGroup.setToolPassive(state.activeTool);

      // Activate new tool
      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
      });

      setState((prev) => ({ ...prev, activeTool: toolName }));
    }
  }, [state.activeTool]);

  // Apply window/level preset
  const applyPreset = useCallback(
    async (windowWidth: number, windowCenter: number) => {
      if (!renderingEngineRef.current) return;

      const viewport = renderingEngineRef.current.getViewport(
        viewportIdRef.current
      );

      if (viewport) {
        const properties = viewport.getProperties();
        viewport.setProperties({
          ...properties,
          voiRange: {
            lower: windowCenter - windowWidth / 2,
            upper: windowCenter + windowWidth / 2,
          },
        });
        viewport.render();

        setState((prev) => ({ ...prev, windowWidth, windowCenter }));
      }
    },
    []
  );

  // Navigate to frame
  const navigateToFrame = useCallback(async (index: number) => {
    if (!renderingEngineRef.current) return;

    const viewport = renderingEngineRef.current.getViewport(
      viewportIdRef.current
    );

    if (viewport) {
      const clampedIndex = Math.max(0, Math.min(index, state.totalImages - 1));
      await viewport.setImageIdIndex(clampedIndex);
      setState((prev) => ({ ...prev, currentImageIndex: clampedIndex }));
    }
  }, [state.totalImages]);

  // Toggle cine playback
  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    } else {
      playIntervalRef.current = setInterval(() => {
        setState((prev) => {
          const nextIndex = (prev.currentImageIndex + 1) % prev.totalImages;
          navigateToFrame(nextIndex);
          return { ...prev, currentImageIndex: nextIndex };
        });
      }, 100); // 10 fps
    }

    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [state.isPlaying, navigateToFrame]);

  // Reset viewport
  const resetViewport = useCallback(async () => {
    if (!renderingEngineRef.current) return;

    const viewport = renderingEngineRef.current.getViewport(
      viewportIdRef.current
    );

    if (viewport) {
      viewport.resetCamera();
      viewport.render();
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      viewportRef.current?.parentElement?.requestFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setState((prev) => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'r':
        case 'R':
          resetViewport();
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          navigateToFrame(state.currentImageIndex - 1);
          break;
        case 'ArrowRight':
          navigateToFrame(state.currentImageIndex + 1);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'Escape':
          if (state.isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    resetViewport,
    togglePlay,
    navigateToFrame,
    toggleFullscreen,
    state.currentImageIndex,
    state.isFullscreen,
  ]);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">
            <span className="font-medium text-white">{patientName || 'Unknown'}</span>
            <span className="mx-2">|</span>
            <span>{modality}</span>
            {bodyPart && (
              <>
                <span className="mx-2">|</span>
                <span>{bodyPart}</span>
              </>
            )}
            {studyDate && (
              <>
                <span className="mx-2">|</span>
                <span>{studyDate}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setState((prev) => ({ ...prev, showMetadata: !prev.showMetadata }))}
            className={`p-2 rounded transition-colors ${
              state.showMetadata ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title="Toggle Metadata (I)"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {state.isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tool Panel */}
        <div className="w-12 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-2 gap-1">
          {(Object.keys(TOOL_ICONS) as ToolName[]).map((tool) => (
            <button
              key={tool}
              onClick={() => setActiveTool(tool)}
              className={`p-2 rounded transition-colors ${
                state.activeTool === tool
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={tool}
            >
              {TOOL_ICONS[tool]}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={resetViewport}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Reset (R)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative">
          {/* Cornerstone Viewport Container */}
          <div
            ref={viewportRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />

          {/* Loading Overlay */}
          {state.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading DICOM...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {state.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center max-w-md p-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Error Loading Images</h3>
                <p className="text-gray-400 mb-4">{state.error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Metadata Panel */}
          {state.showMetadata && (
            <div className="absolute top-4 left-4 bg-black/80 rounded-lg p-4 text-sm text-gray-300 min-w-[200px]">
              <h4 className="font-medium text-white mb-2">Study Info</h4>
              <div className="space-y-1">
                <p>Patient: {patientName || 'Unknown'}</p>
                <p>Modality: {modality}</p>
                {bodyPart && <p>Body Part: {bodyPart}</p>}
                {studyDate && <p>Date: {studyDate}</p>}
                <p>Images: {state.totalImages}</p>
              </div>
              <h4 className="font-medium text-white mt-4 mb-2">Window/Level</h4>
              <div className="space-y-1">
                <p>Width: {state.windowWidth}</p>
                <p>Center: {state.windowCenter}</p>
              </div>
            </div>
          )}

          {/* Image Counter */}
          {state.totalImages > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded text-white text-sm">
              {state.currentImageIndex + 1} / {state.totalImages}
            </div>
          )}
        </div>

        {/* Preset Panel */}
        <div className="w-48 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
          <h4 className="text-sm font-medium text-white mb-3">W/L Presets</h4>
          <div className="space-y-1">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.windowWidth, preset.windowCenter)}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>

          {state.totalImages > 1 && (
            <>
              <h4 className="text-sm font-medium text-white mt-6 mb-3">Navigation</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateToFrame(state.currentImageIndex - 1)}
                  disabled={state.currentImageIndex === 0}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlay}
                  className={`p-2 rounded transition-colors ${
                    state.isPlaying
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title="Play/Pause (Space)"
                >
                  {state.isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => navigateToFrame(state.currentImageIndex + 1)}
                  disabled={state.currentImageIndex === state.totalImages - 1}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Scroll slider */}
              <input
                type="range"
                min={0}
                max={state.totalImages - 1}
                value={state.currentImageIndex}
                onChange={(e) => navigateToFrame(parseInt(e.target.value))}
                className="w-full mt-3"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CornerstoneDicomViewer;
