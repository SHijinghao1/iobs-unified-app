import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';
import type { URDFRobot, URDFJoint } from 'urdf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { DEG } from '../constants/machine';
import { getCachedGeometry, hasGeometry, setLoadingStatus } from '../utils/modelPreloader';

// 通用 URDF 模型组件：负责加载模型、驱动关节，并应用局部偏移。

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
  simplifyThreshold?: number;
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
    const c = child as any;
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

// ── 复用的临时对象，减少逐帧创建带来的回收压力 ─────────────────────────────
const _scratchVec   = new THREE.Vector3();
const _scratchQuat  = new THREE.Quaternion();
const _scratchEuler = new THREE.Euler();
const _scratchQuat2 = new THREE.Quaternion();
const _loggedWarnings = new Set<string>();

const throttledWarn = (key: string, ...args: unknown[]) => {
  if (_loggedWarnings.has(key)) return;
  _loggedWarnings.add(key);
  console.warn(...args);
  setTimeout(() => _loggedWarnings.delete(key), 5000);
};

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
  simplifyThreshold = 0,
}) => {
  const { invalidate } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const robotRef = useRef<URDFRobot | null>(null);
  const jointsRef = useRef<Map<string, URDFJoint>>(new Map());
  const linksRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material>>(new Map());
  const curValues = useRef<Record<string, number>>({});
  const prevAppliedPos = useRef<Map<string, THREE.Vector3>>(new Map());
  const prevAppliedQuat = useRef<Map<string, THREE.Quaternion>>(new Map());
  const positionRef    = useRef(position);
  const rotationRef    = useRef(rotation);
  const jointValuesRef = useRef(jointValues);
  const linkOffsetsRef = useRef(linkOffsets);
  const lerpFactorRef  = useRef(lerpFactor);
  const jointsDirtyRef = useRef(true);
  const offsetsDirtyRef = useRef(true);
  const transformDirtyRef = useRef(true);
  const animationActiveRef = useRef(true);
  const highlightedLinksRef = useRef<string[]>([]);
  const highlightedSetRef = useRef<Set<string>>(new Set());
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
  useEffect(() => { lerpFactorRef.current = lerpFactor; }, [lerpFactor]);

  const defaultMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.15 }),
    []
  );

  const highlightMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, 
      emissive: 0x00ff00, 
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8
    }),
    []
  );

  // 处理高亮逻辑
  useEffect(() => {
    const robot = robotRef.current;
    if (!robot) return;

    // 浅比较高亮列表是否变化
    const prevLinks = highlightedLinksRef.current;
    const changed = prevLinks.length !== highlightedLinks.length || 
      prevLinks.some((link, i) => link !== highlightedLinks[i]);
    
    if (!changed) return;
    
    highlightedLinksRef.current = highlightedLinks;
    const highlightedSet = new Set(highlightedLinks);
    highlightedSetRef.current = highlightedSet;

    linksRef.current.forEach((link, name) => {
      const shouldHighlight = highlightedSet.has(name);
      link.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          
          if (!originalMaterialsRef.current.has(mesh)) {
            originalMaterialsRef.current.set(mesh, mesh.material as THREE.Material);
          }

          if (shouldHighlight) {
            mesh.material = highlightMaterial;
          } else {
            mesh.material = originalMaterialsRef.current.get(mesh) || defaultMaterial;
          }
        }
      });
    });
    invalidate();
  }, [highlightedLinks, invalidate, highlightMaterial, defaultMaterial]);

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

      // 1) 已经是绝对地址时，直接使用
      if (isAbsoluteUrl(normalized)) return [normalized];

      // 2) 如果是项目内路径，确保加上正确的 BASE_URL
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

      const candidates = [
        urdfDir ? `${urdfDir}/${normalized}` : normalized,
        `${baseUrl}/models/${baseName}`,
      ];

      return candidates.filter((p, i) => candidates.indexOf(p) === i);
    };

    const MAX_RETRIES_PER_PATH = 2;
    const RETRY_DELAY_MS = 300;

    loader.loadMeshCb = (path, _manager, done) => {
      const filename = path.split('/').pop() ?? path;
      
      const cachedGeo = getCachedGeometry(filename);
      if (cachedGeo) {
        done(new THREE.Mesh(cachedGeo, material ?? defaultMaterial), undefined);
        return;
      }

      const stlLoader = new STLLoader();
      const candidates = resolveMeshCandidates(path, urdfUrl);
      let currentCandidateIdx = 0;
      let retryCount = 0;

      const tryLoadWithRetry = () => {
        if (currentCandidateIdx >= candidates.length) {
          if (retryCount < MAX_RETRIES_PER_PATH) {
            retryCount++;
            currentCandidateIdx = 0;
            setTimeout(tryLoadWithRetry, RETRY_DELAY_MS * retryCount);
            return;
          }

          throttledWarn(`stl-failed-${path}`, '[URDFModel] STL load failed after retries:', path);
          done(new THREE.Object3D(), new Error(`Failed to load STL: ${path}`));
          return;
        }

        const candidate = candidates[currentCandidateIdx];
        stlLoader.load(
          candidate,
          (geo) => {
            geo.computeVertexNormals();
            setLoadingStatus(filename, 'loaded');
            done(new THREE.Mesh(geo, material ?? defaultMaterial), undefined);
          },
          undefined,
          (err) => {
            throttledWarn(candidate, '[URDFModel] STL candidate failed', { requested: path, candidate });
            currentCandidateIdx++;
            tryLoadWithRetry();
          }
        );
      };

      tryLoadWithRetry();
    };

    let loadAttemptCount = 0;
    const MAX_URDF_RETRIES = 3;

    const attemptLoad = () => {
      loadAttemptCount++;

      loader.load(
        urdfUrl,
        (robot) => {
          if (disposed) return;

          let meshCount = 0;
          let emptyMeshCount = 0;
          robot.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              meshCount++;
              const mesh = obj as THREE.Mesh;
              if (!(mesh.geometry as THREE.BufferGeometry).attributes.position ||
                  (mesh.geometry as THREE.BufferGeometry).attributes.position.count === 0) {
                emptyMeshCount++;
              }
            }
          });

          if (emptyMeshCount > 0 && loadAttemptCount < MAX_URDF_RETRIES) {
            throttledWarn('empty-mesh', `[URDFModel] Found ${emptyMeshCount} empty meshes, retrying...`);
            setTimeout(attemptLoad, 500 * loadAttemptCount);
            return;
          }

          if (robotRef.current && groupRef.current) {
            groupRef.current.remove(robotRef.current);
          }
          robotRef.current = robot;
          jointsRef.current = collectJoints(robot);
          linksRef.current = collectLinks(robot);
          prevAppliedPos.current.clear();
          prevAppliedQuat.current.clear();
          jointsRef.current.forEach((_, name) => { curValues.current[name] = 0; });
          
          robot.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh;
              mesh.userData.measurePickable = true;
              mesh.frustumCulled = true;
              mesh.matrixAutoUpdate = false;
              mesh.updateMatrix();
              mesh.frustumCulled = true;
              
              const geo = mesh.geometry as THREE.BufferGeometry;
              if (geo.attributes.position) {
                geo.computeBoundingBox();
                geo.computeBoundingSphere();
              }
            }
          });
          if (material) applyMaterial(robot, material);
          
          robot.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh;
              if (!originalMaterialsRef.current.has(mesh)) {
                originalMaterialsRef.current.set(mesh, mesh.material as THREE.Material);
              }
            }
          });
          groupRef.current?.add(robot);
          onLoad?.(robot);
        },
        undefined,
        (err) => {
          throttledWarn(`urdf-error-${loadAttemptCount}`, '[URDFModel] URDF load error, attempt:', loadAttemptCount);
          if (loadAttemptCount < MAX_URDF_RETRIES) {
            setTimeout(attemptLoad, 1000 * loadAttemptCount);
          }
        }
      );
    };

    attemptLoad();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urdfUrl]);

  useFrame((_state, delta) => {
    const robot = robotRef.current;
    if (!robot) return;

    if (!animationActiveRef.current && !jointsDirtyRef.current && !offsetsDirtyRef.current && !transformDirtyRef.current) {
      return;
    }

    const k = Math.min(1, lerpFactorRef.current * 60 * delta);
    const cur = curValues.current;
    const jv  = jointValuesRef.current;
    const lo = linkOffsetsRef.current;

    let hasAnimatedChange = false;

    if (jointsDirtyRef.current || animationActiveRef.current) {
      jointsRef.current.forEach((_joint, name) => {
        const target = jv[name] ?? 0;
        const prev   = cur[name] ?? 0;
        const next   = prev + (target - prev) * k;
        if (Math.abs(next - prev) > 1e-6) hasAnimatedChange = true;
        cur[name] = next;
        robot.setJointValue(name, next);
      });
      jointsDirtyRef.current = false;
    }

    if (offsetsDirtyRef.current || animationActiveRef.current) {
      linksRef.current.forEach((link, name) => {
        const off    = lo[name];
        const isZero = !off || (off.pos.x === 0 && off.pos.y === 0 && off.pos.z === 0 && off.rot.x === 0 && off.rot.y === 0 && off.rot.z === 0);

        const prevPos  = prevAppliedPos.current.get(name);
        const prevQuat = prevAppliedQuat.current.get(name);
        
        // 获取该 link 特有的平滑系数，如果没有则使用全局的
        const specificLerp = (off as any)?.lerpFactor ?? lerpFactorRef.current;
        // 如果 specificLerp 为 0，则不进行平滑处理，直接应用
        const linkK = specificLerp === 0 ? 1 : Math.min(1, specificLerp * 60 * delta);

        if (prevPos)  link.position.sub(prevPos);
        if (prevQuat) link.quaternion.premultiply(_scratchQuat2.copy(prevQuat).invert());

        if (isZero) {
          if (prevPos) {
            _scratchVec.set(0, 0, 0);
            prevPos.lerp(_scratchVec, linkK);
            if (prevPos.lengthSq() < 1e-9) {
              prevAppliedPos.current.delete(name);
            } else {
              hasAnimatedChange = true;
              link.position.add(prevPos);
            }
          }
          if (prevQuat) {
            _scratchQuat.identity();
            prevQuat.slerp(_scratchQuat, linkK);
            if (1 - Math.abs(prevQuat.dot(_scratchQuat)) < 1e-9) {
              prevAppliedQuat.current.delete(name);
            } else {
              hasAnimatedChange = true;
              link.quaternion.premultiply(prevQuat);
            }
          }
          return;
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
      });
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