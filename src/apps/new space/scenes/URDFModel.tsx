/**
 * @file URDFModel.tsx
 * @description URDF模型加载与渲染组件，负责加载和渲染URDF格式的3D模型
 * @author IOBS Team
 * @date 2024-01-01
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';
import type { URDFRobot, URDFJoint } from 'urdf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

import { DEG } from '../constants/machine';

export interface LinkMaterialDef {
  color: number;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

export type LinkMaterialMap = Record<string, LinkMaterialDef>;

export interface EnclosureFaceMaterials {
  frontBack: LinkMaterialDef;
  leftRight: LinkMaterialDef;
  surround: LinkMaterialDef;
}

export interface JointValues {
  [jointName: string]: number;
}

export interface LinkOffset {
  pos: { x: number; y: number; z: number };
  rot: { x: number; y: number; z: number };
  lerpFactor?: number;
}

export type LinkOffsets = Record<string, LinkOffset>;

interface URDFModelProps {
  urdfUrl: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  jointValues?: JointValues;
  linkOffsets?: LinkOffsets;
  lerpFactor?: number;
  onLoad?: (robot: URDFRobot) => void;
  material?: THREE.Material;
  highlightedLinks?: string[];
  linkMaterials?: LinkMaterialMap;
  enclosureFaceMaterials?: Record<string, EnclosureFaceMaterials>;
}

function collectJoints(obj: THREE.Object3D): Map<string, URDFJoint> {
  const map = new Map<string, URDFJoint>();
  obj.traverse((child) => {
    if ((child as URDFJoint).isURDFJoint) map.set(child.name, child as URDFJoint);
  });
  return map;
}

function collectLinks(obj: THREE.Object3D): Map<string, THREE.Object3D> {
  const map = new Map<string, THREE.Object3D>();
  obj.traverse((child) => {
    const c = child as THREE.Object3D & { isURDFLink?: boolean; isURDFJoint?: boolean };
    const isLink = c.isURDFLink === true;
    const isJoint = c.isURDFJoint === true;
    const isMesh = (child as THREE.Mesh).isMesh;
    if ((isLink || (!isJoint && !isMesh && child.name)) && child.name) {
      map.set(child.name, child);
    }
  });
  return map;
}

function applyMaterial(obj: THREE.Object3D, mat: THREE.Material) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = mat;
  });
}

const _scratchVec = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchEuler = new THREE.Euler();
const _scratchQuat2 = new THREE.Quaternion();

export const URDFModel: React.FC<URDFModelProps> = ({
  urdfUrl,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  jointValues = {},
  linkOffsets = {},
  lerpFactor = 0.12,
  onLoad,
  material,
  highlightedLinks = [],
  linkMaterials = {},
  enclosureFaceMaterials = {},
}) => {
  const { invalidate } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const robotRef = useRef<URDFRobot | null>(null);
  const jointsRef = useRef<Map<string, URDFJoint>>(new Map());
  const linksRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const cachedJointEntriesRef = useRef<Array<[string, URDFJoint]>>([]);
  const cachedLinkEntriesRef = useRef<Array<[string, THREE.Object3D]>>([]);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material>>(new Map());
  const curValues = useRef<Record<string, number>>({});
  const prevAppliedPos = useRef<Map<string, THREE.Vector3>>(new Map());
  const prevAppliedQuat = useRef<Map<string, THREE.Quaternion>>(new Map());
  const positionRef = useRef(position);
  const rotationRef = useRef(rotation);
  const jointValuesRef = useRef(jointValues);
  const linkOffsetsRef = useRef(linkOffsets);
  const lerpFactorRef = useRef(lerpFactor);
  const jointsDirtyRef = useRef(true);
  const offsetsDirtyRef = useRef(true);
  const transformDirtyRef = useRef(true);
  const animationActiveRef = useRef(true);

  useEffect(() => {
    positionRef.current = position;
    transformDirtyRef.current = true;
    animationActiveRef.current = true;
    invalidate();
  }, [position, invalidate]);
  useEffect(() => {
    rotationRef.current = rotation;
    transformDirtyRef.current = true;
    animationActiveRef.current = true;
    invalidate();
  }, [rotation, invalidate]);
  useEffect(() => {
    jointValuesRef.current = jointValues;
    jointsDirtyRef.current = true;
    animationActiveRef.current = true;
    invalidate();
  }, [jointValues, invalidate]);
  useEffect(() => {
    linkOffsetsRef.current = linkOffsets;
    offsetsDirtyRef.current = true;
    animationActiveRef.current = true;
    invalidate();
  }, [linkOffsets, invalidate]);
  useEffect(() => {
    lerpFactorRef.current = lerpFactor;
  }, [lerpFactor]);

  const defaultMaterial = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: 0xf8f9fa,
      roughness: 0.25,
      metalness: 0.02,
      envMapIntensity: 1.5,
      clearcoat: 0,
    }),
    []
  );

  const linkMaterialsRef = useRef<LinkMaterialMap>(linkMaterials);
  useEffect(() => { linkMaterialsRef.current = linkMaterials; }, [linkMaterials]);

  const enclosureFaceMaterialsRef = useRef<Record<string, EnclosureFaceMaterials>>(enclosureFaceMaterials);
  useEffect(() => { enclosureFaceMaterialsRef.current = enclosureFaceMaterials; }, [enclosureFaceMaterials]);

  const materialCacheRef = useRef<Map<string, THREE.MeshPhysicalMaterial>>(new Map());

  const getLinkMaterial = useCallback((linkName: string): THREE.MeshPhysicalMaterial => {
    const def = linkMaterialsRef.current[linkName];
    if (!def) return defaultMaterial;
    const key = `${def.color}_${def.roughness ?? ''}_${def.metalness ?? ''}_${def.envMapIntensity ?? ''}_${def.clearcoat ?? ''}`;
    let cached = materialCacheRef.current.get(key);
    if (cached) return cached;
    cached = new THREE.MeshPhysicalMaterial({
      color: def.color,
      roughness: def.roughness ?? 0.25,
      metalness: def.metalness ?? 0.02,
      envMapIntensity: def.envMapIntensity ?? 1.5,
      clearcoat: def.clearcoat ?? 0,
      clearcoatRoughness: def.clearcoatRoughness ?? 0.2,
    });
    materialCacheRef.current.set(key, cached);
    return cached;
  }, [defaultMaterial]);

  const applyEnclosureFaceMaterials = useCallback((mesh: THREE.Mesh, faceMats: EnclosureFaceMaterials) => {
    const geo = mesh.geometry;
    if (!geo.attributes.position || !geo.attributes.normal) return;

    const normAttr = geo.attributes.normal;
    const posAttr = geo.attributes.position;
    const faceCount = Math.floor(posAttr.count / 3);

    const colFB = new THREE.Color(faceMats.frontBack.color);
    const colLR = new THREE.Color(faceMats.leftRight.color);
    const colSR = new THREE.Color(faceMats.surround.color);

    const colors = new Float32Array(posAttr.count * 3);
    const _n = new THREE.Vector3();
    const FLAT_THRESHOLD = 0.94;
    const LR_THRESHOLD = 0.9999;

    for (let i = 0; i < faceCount; i++) {
      const i3 = i * 3;
      _n.fromBufferAttribute(normAttr, i3);
      
      const nx = Math.abs(_n.x);
      const ny = Math.abs(_n.y);
      const nz = Math.abs(_n.z);

      let c: THREE.Color;
      const maxN = Math.max(nx, ny, nz);

      if (maxN < FLAT_THRESHOLD) {
        c = colSR;
      } else if (ny >= nx && ny >= nz) {
        c = colFB;
      } else if (nx >= nz && nx >= LR_THRESHOLD) {
        c = colLR;
      } else {
        c = colSR;
      }

      for (let j = 0; j < 3; j++) {
        const idx = (i3 + j) * 3;
        colors[idx] = c.r;
        colors[idx + 1] = c.g;
        colors[idx + 2] = c.b;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: faceMats.surround.roughness ?? 0.35,
      metalness: faceMats.surround.metalness ?? 0.45,
      envMapIntensity: faceMats.surround.envMapIntensity ?? 1.0,
      vertexColors: true,
    });
    mesh.material = mat;
  }, []);

  const highlightMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1.0, transparent: false, opacity: 1.0 }),
    []
  );

  useEffect(() => {
    const robot = robotRef.current;
    if (!robot) return;
    const highlightedSet = new Set(highlightedLinks);
    const cachedLinks = cachedLinkEntriesRef.current;
    for (let i = 0; i < cachedLinks.length; i++) {
      const [name, link] = cachedLinks[i];
      const shouldHighlight = highlightedSet.has(name);
      link.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (shouldHighlight) {
            if (!originalMaterialsRef.current.has(mesh)) {
              originalMaterialsRef.current.set(mesh, mesh.material as THREE.Material);
            }
            mesh.material = highlightMaterial;
          } else {
            originalMaterialsRef.current.delete(mesh);
            const faceMats = enclosureFaceMaterialsRef.current[name];
            if (faceMats) {
              applyEnclosureFaceMaterials(mesh, faceMats);
            } else {
              mesh.material = getLinkMaterial(name);
            }
          }
        }
      });
    }
    invalidate();
  }, [highlightedLinks, linkMaterials, enclosureFaceMaterials, invalidate, highlightMaterial, getLinkMaterial, applyEnclosureFaceMaterials]);

  useEffect(() => {
    let disposed = false;
    const loader = new URDFLoader();
    const isAbsoluteUrl = (v: string): boolean => /^(https?:)?\/\//i.test(v);
    const resolveMeshCandidates = (raw: string, baseUrdfUrl: string): string[] => {
      const input = (raw || '').replace(/\\/g, '/').trim();
      if (!input) return [];
      const normalized = input
        .replace(/^package:\/\/([^/]+)\/meshes\//i, '/models/$1/')
        .replace(/^package:\/\/([^/]+)\//i, '/models/$1/')
        .replace(/^\/([^/]+)\/meshes\//i, '/models/$1/')
        .replace(/^([^/]+)\/meshes\//i, '/models/$1/')
        .replace(/\/models\/urdf\/+models\//g, '/models/')
        .replace(/\/+/g, '/');
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
      if (isAbsoluteUrl(normalized)) return [normalized];
      if (normalized.startsWith('/')) {
        const baseName = normalized.split('/').pop() ?? normalized;
        const fullPath = `${baseUrl}${normalized}`;
        const modelPath = `${baseUrl}/models/${baseName}`;
        const absCandidates = [fullPath, modelPath];
        return absCandidates.filter((p, i) => absCandidates.indexOf(p) === i);
      }
      const cleanUrdf = baseUrdfUrl.split('?')[0].split('#')[0];
      const urdfDir = cleanUrdf.includes('/') ? cleanUrdf.slice(0, cleanUrdf.lastIndexOf('/')) : '';
      const baseName = normalized.split('/').pop() ?? normalized;
      const candidates = [urdfDir ? `${urdfDir}/${normalized}` : normalized, `${baseUrl}/models/${baseName}`];
      return candidates.filter((p, i) => candidates.indexOf(p) === i);
    };

    loader.loadMeshCb = (path, _manager, done) => {
      const stlLoader = new STLLoader();
      const candidates = resolveMeshCandidates(path, urdfUrl);
      const tryLoad = (idx: number) => {
        if (idx >= candidates.length) {
          done(new THREE.Object3D(), new Error(`Unable to resolve STL path: ${path}`));
          return;
        }
        const candidate = candidates[idx];
        stlLoader.load(
          candidate,
          (geo) => {
            geo.computeVertexNormals();
            done(new THREE.Mesh(geo, material ?? defaultMaterial), undefined);
          },
          undefined,
          () => tryLoad(idx + 1)
        );
      };
      tryLoad(0);
    };

    loader.load(
      urdfUrl,
      (robot) => {
        if (disposed) return;
        if (robotRef.current && groupRef.current) groupRef.current.remove(robotRef.current);
        robotRef.current = robot;
        jointsRef.current = collectJoints(robot);
        linksRef.current = collectLinks(robot);
        cachedJointEntriesRef.current = Array.from(jointsRef.current.entries());
        cachedLinkEntriesRef.current = Array.from(linksRef.current.entries());
        prevAppliedPos.current.clear();
        prevAppliedQuat.current.clear();
        jointsRef.current.forEach((_, name) => {
          curValues.current[name] = 0;
        });
        robot.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).userData.measurePickable = true;
          }
        });
        if (material) {
          applyMaterial(robot, material);
        } else if (Object.keys(linkMaterialsRef.current).length > 0 || Object.keys(enclosureFaceMaterialsRef.current).length > 0) {
          const cachedLinks = cachedLinkEntriesRef.current;
          for (let i = 0; i < cachedLinks.length; i++) {
            const [name, link] = cachedLinks[i];
            const faceMats = enclosureFaceMaterialsRef.current[name];
            link.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (faceMats) {
                  applyEnclosureFaceMaterials(mesh, faceMats);
                } else {
                  mesh.material = getLinkMaterial(name);
                }
              }
            });
          }
        }
        groupRef.current?.add(robot);
        onLoad?.(robot);
      },
      undefined,
      (err) => console.error('[URDFModel] URDF load error:', err)
    );

    const sceneGroup = groupRef.current;
    const prevPosMap = prevAppliedPos.current;
    const prevQuatMap = prevAppliedQuat.current;
    return () => {
      disposed = true;
      if (robotRef.current && sceneGroup) sceneGroup.remove(robotRef.current);
      robotRef.current = null;
      prevPosMap.clear();
      prevQuatMap.clear();
    };
  }, [urdfUrl, onLoad, material, defaultMaterial, getLinkMaterial, applyEnclosureFaceMaterials]);

  useFrame((_state, delta) => {
    const robot = robotRef.current;
    if (!robot) return;
    
    if (!animationActiveRef.current && !jointsDirtyRef.current && !offsetsDirtyRef.current && !transformDirtyRef.current) {
      return;
    }

    const rawK = lerpFactorRef.current * 60 * delta;
    const k = Math.min(1, rawK);
    const cur = curValues.current;
    const jv = jointValuesRef.current;
    const lo = linkOffsetsRef.current;
    let hasAnimatedChange = false;

    if (jointsDirtyRef.current || animationActiveRef.current) {
      const jointEntries = cachedJointEntriesRef.current;
      for (let i = 0; i < jointEntries.length; i++) {
        const [name] = jointEntries[i];
        const target = jv[name] ?? 0;
        const prev = cur[name] ?? 0;
        const next = prev + (target - prev) * k;
        if (Math.abs(next - prev) > 1e-6) hasAnimatedChange = true;
        cur[name] = next;
        robot.setJointValue(name, next);
      }
      jointsDirtyRef.current = false;
    }

    if (offsetsDirtyRef.current || animationActiveRef.current) {
      const linkEntries = cachedLinkEntriesRef.current;
      for (let i = 0; i < linkEntries.length; i++) {
        const [name, link] = linkEntries[i];
        const off = lo[name];
        const isZero = !off || (off.pos.x === 0 && off.pos.y === 0 && off.pos.z === 0 && off.rot.x === 0 && off.rot.y === 0 && off.rot.z === 0);
        const prevPos = prevAppliedPos.current.get(name);
        const prevQuat = prevAppliedQuat.current.get(name);
        const specificLerp = off?.lerpFactor ?? lerpFactorRef.current;
        const linkK = specificLerp === 0 ? 1 : Math.min(1, specificLerp * 60 * delta);

        if (prevPos) link.position.sub(prevPos);
        if (prevQuat) link.quaternion.premultiply(_scratchQuat2.copy(prevQuat).invert());

        if (isZero) {
          if (prevPos) {
            _scratchVec.set(0, 0, 0);
            prevPos.lerp(_scratchVec, linkK);
            if (prevPos.lengthSq() < 1e-9) prevAppliedPos.current.delete(name);
            else {
              hasAnimatedChange = true;
              link.position.add(prevPos);
            }
          }
          if (prevQuat) {
            _scratchQuat.identity();
            prevQuat.slerp(_scratchQuat, linkK);
            if (1 - Math.abs(prevQuat.dot(_scratchQuat)) < 1e-9) prevAppliedQuat.current.delete(name);
            else {
              hasAnimatedChange = true;
              link.quaternion.premultiply(prevQuat);
            }
          }
          continue;
        }

        _scratchVec.set(off.pos.x, off.pos.y, off.pos.z);
        _scratchEuler.set(off.rot.x * DEG, off.rot.y * DEG, off.rot.z * DEG, 'XYZ');
        _scratchQuat.setFromEuler(_scratchEuler);

        let curPosDelta = prevAppliedPos.current.get(name);
        if (!curPosDelta) {
          curPosDelta = new THREE.Vector3();
          prevAppliedPos.current.set(name, curPosDelta);
        }
        if (curPosDelta.distanceToSquared(_scratchVec) > 1e-9) hasAnimatedChange = true;
        curPosDelta.lerp(_scratchVec, linkK);

        let curQuatDelta = prevAppliedQuat.current.get(name);
        if (!curQuatDelta) {
          curQuatDelta = new THREE.Quaternion();
          prevAppliedQuat.current.set(name, curQuatDelta);
        }
        if (1 - Math.abs(curQuatDelta.dot(_scratchQuat)) > 1e-9) hasAnimatedChange = true;
        curQuatDelta.slerp(_scratchQuat, linkK);

        link.position.add(curPosDelta);
        link.quaternion.premultiply(curQuatDelta);
      }
      offsetsDirtyRef.current = false;
    }

    const g = groupRef.current;
    if (g && (transformDirtyRef.current || animationActiveRef.current)) {
      const pos = positionRef.current;
      const rot = rotationRef.current;
      const positionChanged = g.position.distanceToSquared(_scratchVec.set(pos[0], pos[1], pos[2])) > 1e-8;
      _scratchEuler.set(rot[0], rot[1], rot[2], 'XYZ');
      const rotationTarget = _scratchQuat.setFromEuler(_scratchEuler);
      const rotationChanged = 1 - Math.abs(g.quaternion.dot(rotationTarget)) > 1e-8;
      if (positionChanged || rotationChanged) hasAnimatedChange = true;
      g.position.lerp(_scratchVec, k);
      g.quaternion.slerp(rotationTarget, k);
      transformDirtyRef.current = false;
    }

    animationActiveRef.current = hasAnimatedChange;
    if (hasAnimatedChange) invalidate();
  });

  return <group ref={groupRef} scale={scale} />;
};
