import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');

const _loggedWarnings = new Set<string>();
const throttledWarn = (key: string, message: string) => {
  if (_loggedWarnings.has(key)) return;
  _loggedWarnings.add(key);
  console.warn(message);
  setTimeout(() => _loggedWarnings.delete(key), 5000);
};

const BED_STL_FILES = [
  'models/optimized/surgical_bed_v2/bed_enclosure_1_bin.stl',
  'models/optimized/surgical_bed_v2/bed_enclosure_2_bin.stl',
  'models/optimized/surgical_bed_v2/bed_enclosure_3_bin.stl',
  'models/optimized/surgical_bed_v2/bed_enclosure_4_bin.stl',
  'models/optimized/surgical_bed_v2/bed_base_new_bin.stl',
  'models/optimized/surgical_bed_v2/bed_panel_left_leg_bin.stl',
  'models/optimized/surgical_bed_v2/bed_panel_right_leg_bin.stl',
  'models/optimized/surgical_bed_v2/bed_panel_mid_bin.stl',
  'models/optimized/surgical_bed_v2/bed_panel_back_bin.stl',
];

const CARM_STL_FILES = [
  'models/optimized/c_arm/c_arm_column.STL',
  'models/optimized/c_arm/c_arm_head.STL',
  'models/optimized/c_arm/c_arm_head_lower.STL',
  'models/optimized/c_arm/c_arm_ring_arm.STL',
  'models/optimized/c_arm/c_arm_base.STL',
  'models/optimized/c_arm/c_arm_ring_no_arm.STL',
];

const geometryCache = new Map<string, THREE.BufferGeometry>();
const loadingStatus = new Map<string, 'pending' | 'loading' | 'loaded' | 'error'>();
const loadingPromises = new Map<string, Promise<THREE.BufferGeometry | null>>();

let preloadProgressCallback: ((loaded: number, total: number, model: 'bed' | 'cArm') => void) | null = null;

const stlLoader = new STLLoader();

export function setPreloadProgressCallback(
  callback: (loaded: number, total: number, model: 'bed' | 'cArm') => void
) {
  preloadProgressCallback = callback;
}

export function getCachedGeometry(filename: string): THREE.BufferGeometry | undefined {
  return geometryCache.get(filename);
}

export function getCachedGLTF(_filename: string): THREE.Group | undefined {
  return undefined;
}

export function hasGeometry(filename: string): boolean {
  return geometryCache.has(filename);
}

export function setLoadingStatus(filename: string, status: 'pending' | 'loading' | 'loaded' | 'error') {
  loadingStatus.set(filename, status);
}

export function getLoadingStatus(filename: string): 'pending' | 'loading' | 'loaded' | 'error' | undefined {
  return loadingStatus.get(filename);
}

const LOAD_TIMEOUT_MS = 60000;

function loadSTLWithTimeout(url: string, filename: string): Promise<THREE.BufferGeometry | null> {
  if (loadingPromises.has(filename)) {
    return loadingPromises.get(filename)!;
  }

  const promise = new Promise<THREE.BufferGeometry | null>((resolve) => {
    const timeout = setTimeout(() => {
      throttledWarn(filename, `[ModelPreloader] Load timeout for ${filename}`);
      resolve(null);
    }, LOAD_TIMEOUT_MS);

    stlLoader.load(
      url,
      (geometry) => {
        clearTimeout(timeout);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        resolve(geometry);
      },
      undefined,
      (error) => {
        clearTimeout(timeout);
        throttledWarn(filename, `[ModelPreloader] Failed to load ${filename}`);
        resolve(null);
      }
    );
  });

  loadingPromises.set(filename, promise);
  return promise;
}

export async function preloadSTLModel(
  files: string[],
  modelType: 'bed' | 'cArm'
): Promise<{ loaded: number; total: number }> {
  const total = files.length;
  let loaded = 0;

  const loadPromises = files.map(async (file) => {
    const url = `${BASE_URL}/${file}`;
    const filename = file.split('/').pop() || file;
    
    if (geometryCache.has(filename)) {
      loaded++;
      preloadProgressCallback?.(loaded, total, modelType);
      return;
    }

    loadingStatus.set(filename, 'loading');
    
    try {
      const geometry = await loadSTLWithTimeout(url, filename);
      if (geometry) {
        geometryCache.set(filename, geometry);
        loadingStatus.set(filename, 'loaded');
      } else {
        loadingStatus.set(filename, 'error');
      }
    } catch (error) {
      throttledWarn(filename, `[ModelPreloader] Failed to preload ${filename}`);
      loadingStatus.set(filename, 'error');
    }
    loaded++;
    preloadProgressCallback?.(loaded, total, modelType);
  });

  await Promise.all(loadPromises);
  
  return { loaded, total };
}

export async function preloadAllModels(
  progressCallback?: (loaded: number, total: number, model: 'bed' | 'cArm') => void
): Promise<void> {
  if (progressCallback) {
    setPreloadProgressCallback(progressCallback);
  }

  await Promise.all([
    preloadSTLModel(BED_STL_FILES, 'bed'),
    preloadSTLModel(CARM_STL_FILES, 'cArm'),
  ]);
}

export async function preloadBedModel(): Promise<void> {
  await preloadSTLModel(BED_STL_FILES, 'bed');
}

export async function preloadCArmModel(): Promise<void> {
  await preloadSTLModel(CARM_STL_FILES, 'cArm');
}

export function getCacheStats(): { geometries: number; totalVertices: number } {
  let totalVertices = 0;
  geometryCache.forEach((geo) => {
    if (geo.attributes.position) {
      totalVertices += geo.attributes.position.count;
    }
  });
  
  return {
    geometries: geometryCache.size,
    totalVertices,
  };
}

export function clearCache(): void {
  geometryCache.forEach((geo) => geo.dispose());
  geometryCache.clear();
  loadingPromises.clear();
  loadingStatus.clear();
}
