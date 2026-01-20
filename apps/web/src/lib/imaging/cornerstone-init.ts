/**
 * Cornerstone3D Initialization
 *
 * Initializes Cornerstone3D for DICOM image rendering.
 * Must be called once before using any Cornerstone functionality.
 */

import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import cornerstoneDICOMImageLoader, { init as initDicomImageLoader } from '@cornerstonejs/dicom-image-loader';

let isInitialized = false;

/**
 * Initialize Cornerstone3D and register tools
 */
export async function initCornerstone(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Initialize Cornerstone3D core
  await cornerstone.init();

  // Initialize the DICOM image loader with configuration
  const maxWebWorkers = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? Math.min(navigator.hardwareConcurrency, 4)
    : 2;

  initDicomImageLoader({
    maxWebWorkers,
    decodeConfig: {
      convertFloatPixelDataToInt: false,
      use16BitDataType: true,
    },
  });

  // Register the wadouri image loader
  cornerstoneDICOMImageLoader.wadouri.register();

  // Initialize Cornerstone Tools
  await cornerstoneTools.init();

  // Add tools
  cornerstoneTools.addTool(cornerstoneTools.PanTool);
  cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
  cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
  cornerstoneTools.addTool(cornerstoneTools.StackScrollTool);
  cornerstoneTools.addTool(cornerstoneTools.LengthTool);
  cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
  cornerstoneTools.addTool(cornerstoneTools.RectangleROITool);
  cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool);
  cornerstoneTools.addTool(cornerstoneTools.AngleTool);

  isInitialized = true;
}

/**
 * Create a WADO-URI image ID for loading DICOM from our API
 */
export function createImageId(studyInstanceUID: string, instanceIndex: number = 0): string {
  // Use wadouri scheme with our WADO-RS endpoint
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `wadouri:${baseUrl}/api/dicomweb/wado/studies/${studyInstanceUID}/instances/${instanceIndex}`;
}

/**
 * Create image IDs for a study with multiple instances
 */
export function createImageIds(
  studyInstanceUID: string,
  instanceCount: number
): string[] {
  const imageIds: string[] = [];
  for (let i = 0; i < instanceCount; i++) {
    imageIds.push(createImageId(studyInstanceUID, i));
  }
  return imageIds.length > 0 ? imageIds : [createImageId(studyInstanceUID, 0)];
}

/**
 * Window/Level presets for different modalities
 */
export const WINDOW_LEVEL_PRESETS: Record<
  string,
  Array<{ name: string; windowWidth: number; windowCenter: number }>
> = {
  CT: [
    { name: 'Soft Tissue', windowWidth: 400, windowCenter: 40 },
    { name: 'Lung', windowWidth: 1500, windowCenter: -600 },
    { name: 'Bone', windowWidth: 2500, windowCenter: 480 },
    { name: 'Brain', windowWidth: 80, windowCenter: 40 },
    { name: 'Liver', windowWidth: 150, windowCenter: 30 },
    { name: 'Abdomen', windowWidth: 350, windowCenter: 50 },
    { name: 'Mediastinum', windowWidth: 350, windowCenter: 50 },
  ],
  MR: [
    { name: 'Default', windowWidth: 600, windowCenter: 300 },
    { name: 'T1 Weighted', windowWidth: 1200, windowCenter: 600 },
    { name: 'T2 Weighted', windowWidth: 800, windowCenter: 400 },
    { name: 'FLAIR', windowWidth: 1000, windowCenter: 500 },
  ],
  XR: [
    { name: 'Default', windowWidth: 4096, windowCenter: 2048 },
    { name: 'Chest', windowWidth: 2048, windowCenter: 1024 },
    { name: 'Bone', windowWidth: 2500, windowCenter: 480 },
  ],
  US: [
    { name: 'Default', windowWidth: 255, windowCenter: 128 },
  ],
  MG: [
    { name: 'Default', windowWidth: 4096, windowCenter: 2048 },
  ],
  NM: [
    { name: 'Default', windowWidth: 4096, windowCenter: 2048 },
  ],
  PT: [
    { name: 'Default', windowWidth: 4096, windowCenter: 2048 },
  ],
};

/**
 * Get presets for a specific modality
 */
export function getPresetsForModality(
  modality: string
): Array<{ name: string; windowWidth: number; windowCenter: number }> {
  return WINDOW_LEVEL_PRESETS[modality] || WINDOW_LEVEL_PRESETS.CT;
}

// Re-export cornerstone modules for convenience
export { cornerstone, cornerstoneTools, cornerstoneDICOMImageLoader };
