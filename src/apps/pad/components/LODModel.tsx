import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '');

interface LODModelProps {
  lodPath: string;
  material?: THREE.Material;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  distances?: [number, number, number];
}

const loader = new STLLoader();
const geometryCache = new Map<string, THREE.BufferGeometry>();

async function loadLODGeometry(path: string): Promise<THREE.BufferGeometry> {
  if (geometryCache.has(path)) {
    return geometryCache.get(path)!.clone();
  }
  
  return new Promise((resolve, reject) => {
    loader.load(
      `${BASE_URL}/${path}`,
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometryCache.set(path, geometry);
        resolve(geometry.clone());
      },
      undefined,
      reject
    );
  });
}

export function LODModel({
  lodPath,
  material,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  distances = [0, 3, 8],
}: LODModelProps) {
  const lodRef = useRef<THREE.LOD | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  const defaultMaterial = useMemo(() => 
    new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.1,
      roughness: 0.7,
    }),
  []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const loadModels = async () => {
      const lod = new THREE.LOD();
      const levels = ['high', 'medium', 'low'] as const;
      
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const path = `${lodPath}/${level}.stl`;
        
        try {
          const geometry = await loadLODGeometry(path);
          const mesh = new THREE.Mesh(geometry, material || defaultMaterial);
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.frustumCulled = true;
          mesh.matrixAutoUpdate = false;
          mesh.updateMatrix();
          lod.addLevel(mesh, distances[i]);
        } catch (error) {
          console.warn(`[LODModel] Failed to load ${path}:`, error);
        }
      }
      
      lod.position.set(position[0], position[1], position[2]);
      lod.rotation.set(rotation[0], rotation[1], rotation[2]);
      lod.scale.set(scale[0], scale[1], scale[2]);
      
      group.add(lod);
      lodRef.current = lod;
    };

    loadModels();

    return () => {
      if (lodRef.current) {
        lodRef.current.levels.forEach(({ object }) => {
          if ((object as THREE.Mesh).geometry) {
            (object as THREE.Mesh).geometry.dispose();
          }
        });
        group.remove(lodRef.current);
        lodRef.current = null;
      }
    };
  }, [lodPath, material, defaultMaterial, distances, position, rotation, scale]);

  useFrame(() => {
    if (lodRef.current) {
      lodRef.current.update(camera);
    }
  });

  return <group ref={groupRef} />;
}

export function useLODManager() {
  const { camera } = useThree();
  
  const updateLOD = (lod: THREE.LOD) => {
    lod.update(camera);
  };
  
  return { updateLOD };
}

export function clearLODCache() {
  geometryCache.forEach(geo => geo.dispose());
  geometryCache.clear();
}
