import { useRef, useReducer, useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

// 测量工具：支持距离、面积和角度三种测量模式。

const pickPoint = (
  e: MouseEvent,
  canvas: HTMLCanvasElement,
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  scene: THREE.Scene,
  meshCacheRef?: { current: THREE.Object3D[] | null },
): THREE.Vector3 => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

  const getMeshes = () => {
    if (!meshCacheRef) return null;
    if (meshCacheRef.current) return meshCacheRef.current;

    const meshes: THREE.Object3D[] = [];
    const pickableMeshes: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh || !obj.visible) return;
      meshes.push(obj);
      if ((obj as THREE.Mesh).userData?.measurePickable === true) {
        pickableMeshes.push(obj);
      }
    });
    meshCacheRef.current = pickableMeshes.length > 0 ? pickableMeshes : meshes;
    return meshCacheRef.current;
  };

  let hits: THREE.Intersection[] = [];
  const cachedMeshes = getMeshes();
  if (cachedMeshes && cachedMeshes.length > 0) {
    hits = raycaster.intersectObjects(cachedMeshes, true);
  } else {
    hits = raycaster.intersectObjects(scene.children, true);
  }

  if (hits.length > 0) return hits[0].point.clone();

  // 模型可能在激活测量后才完成加载；命中为空时重建一次缓存再试
  if (meshCacheRef) {
    meshCacheRef.current = null;
    const refreshed = getMeshes();
    if (refreshed && refreshed.length > 0) {
      const retryHits = raycaster.intersectObjects(refreshed, true);
      if (retryHits.length > 0) return retryHits[0].point.clone();
    }
  }

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pt = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, pt);
  return pt;
};

const buildLinePositions = (pts: THREE.Vector3[], closed = false): Float32Array => {
  if (pts.length < 2) return new Float32Array(0);
  const arr: number[] = [];
  const len = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < len; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    arr.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  return new Float32Array(arr);
};

const centroid = (pts: { x: number; y: number; z: number }[]) => {
  const c = { x: 0, y: 0, z: 0 };
  pts.forEach((p) => { c.x += p.x; c.y += p.y; c.z += p.z; });
  return { x: c.x / pts.length, y: c.y / pts.length, z: c.z / pts.length };
};

const DistanceLayer: React.FC = () => {
  const { isMeasuring, measurementMode, addMeasurement, measurements, removeMeasurement } = useStore();
  const { raycaster, camera, gl, scene } = useThree();
  const pendingRef = useRef<THREE.Vector3 | null>(null);
  const meshCacheRef = useRef<THREE.Object3D[] | null>(null);
  const [pendingPoint, setPendingPoint] = useState<THREE.Vector3 | null>(null);
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const active = isMeasuring && measurementMode === 'distance';

  useEffect(() => {
    if (!active) {
      pendingRef.current = null;
      meshCacheRef.current = null;
      return;
    }
    const canvas = gl.domElement;
    const onClick = (e: MouseEvent) => {
      const pt = pickPoint(e, canvas, raycaster, camera, scene, meshCacheRef);
      if (!pendingRef.current) {
        pendingRef.current = pt;
        setPendingPoint(pt);
        tick();
      } else {
        addMeasurement(
          [pendingRef.current.x, pendingRef.current.y, pendingRef.current.z],
          [pt.x, pt.y, pt.z],
        );
        pendingRef.current = null;
        setPendingPoint(null);
        tick();
      }
    };
    canvas.addEventListener('click', onClick);
    return () => canvas.removeEventListener('click', onClick);
  }, [active, raycaster, camera, gl, scene, addMeasurement]);

  return (
    <>
      {active && pendingPoint && (
        <mesh position={[pendingPoint.x, pendingPoint.y, pendingPoint.z]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#ffff00" />
          <Html position={[0, 0.3, 0]} center>
            <div className="bg-yellow-900/90 text-yellow-300 px-2 py-1 rounded text-xs whitespace-nowrap border border-yellow-600">
              点 1 已选 — 再点第二点
            </div>
          </Html>
        </mesh>
      )}
      {measurements.map((m) => {
        const start = new THREE.Vector3(...m.startPoint);
        const end   = new THREE.Vector3(...m.endPoint);
        const mid   = start.clone().lerp(end, 0.5);
        const pos   = new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z]);
        return (
          <group key={m.id}>
            <mesh position={[start.x, start.y, start.z]}>
              <sphereGeometry args={[0.05, 16, 16]} /><meshBasicMaterial color="#00ffff" />
            </mesh>
            <mesh position={[end.x, end.y, end.z]}>
              <sphereGeometry args={[0.05, 16, 16]} /><meshBasicMaterial color="#00ffff" />
            </mesh>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[pos, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#00ffff" />
            </lineSegments>
            <Html position={[mid.x, mid.y + 0.35, mid.z]} center>
              <div className="flex items-center gap-1 bg-gray-900/90 border border-cyan-400 text-cyan-300 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                <span>{m.distance.toFixed(1)} mm</span>
                <button onClick={() => removeMeasurement(m.id)} className="text-gray-400 hover:text-red-400 ml-1">x</button>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
};

const AreaLayer: React.FC = () => {
  const { isMeasuring, measurementMode, addAreaMeasurement, areaMeasurements, removeAreaMeasurement } = useStore();
  const { raycaster, camera, gl, scene } = useThree();
  const pointsRef = useRef<THREE.Vector3[]>([]);
  const meshCacheRef = useRef<THREE.Object3D[] | null>(null);
  const [pendingPoints, setPendingPoints] = useState<THREE.Vector3[]>([]);
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const active = isMeasuring && measurementMode === 'area';

  useEffect(() => {
    if (!active) {
      pointsRef.current = [];
      meshCacheRef.current = null;
      return;
    }
    const canvas = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // left click only
      const pt = pickPoint(e as unknown as MouseEvent, canvas, raycaster, camera, scene, meshCacheRef);
      pointsRef.current = [...pointsRef.current, pt];
      setPendingPoints(pointsRef.current);
      tick();
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const pts = pointsRef.current;
      if (pts.length >= 3) {
        addAreaMeasurement(pts.map((p) => [p.x, p.y, p.z] as [number, number, number]));
      }
      pointsRef.current = [];
      setPendingPoints([]);
      tick();
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [active, raycaster, camera, gl, scene, addAreaMeasurement]);

  return (
    <>
      {active && pendingPoints.length > 0 && (
        <group>
          {pendingPoints.map((p, i) => (
            <mesh key={i} position={[p.x, p.y, p.z]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshBasicMaterial color="#ffff00" />
            </mesh>
          ))}
          {pendingPoints.length >= 2 && (
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[buildLinePositions(pendingPoints, pendingPoints.length >= 3), 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#ffff00" />
            </lineSegments>
          )}
          <Html position={[pendingPoints[pendingPoints.length-1].x, pendingPoints[pendingPoints.length-1].y+0.35, pendingPoints[pendingPoints.length-1].z]} center>
            <div className="bg-yellow-900/90 text-yellow-300 px-2 py-1 rounded text-xs whitespace-nowrap border border-yellow-600">
              {pendingPoints.length} 点 — 右键完成
            </div>
          </Html>
        </group>
      )}
      {areaMeasurements.map((m) => {
        const pts = m.points.map((p) => new THREE.Vector3(...p));
        const c   = centroid(pts);
        return (
          <group key={m.id}>
            {pts.map((p, i) => (
              <mesh key={i} position={[p.x, p.y, p.z]}>
                <sphereGeometry args={[0.04, 12, 12]} /><meshBasicMaterial color="#00ff88" />
              </mesh>
            ))}
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[buildLinePositions(pts, true), 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#00ff88" />
            </lineSegments>
            <Html position={[c.x, c.y+0.4, c.z]} center>
              <div className="flex items-center gap-1 bg-gray-900/90 border border-green-400 text-green-300 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                <span>S = {m.area.toFixed(0)} mm²</span>
                <button onClick={() => removeAreaMeasurement(m.id)} className="text-gray-400 hover:text-red-400 ml-1">x</button>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
};

const AngleLayer: React.FC = () => {
  const { isMeasuring, measurementMode, addAngleMeasurement, angleMeasurements, removeAngleMeasurement } = useStore();
  const { raycaster, camera, gl, scene } = useThree();
  const pointsRef = useRef<THREE.Vector3[]>([]);
  const meshCacheRef = useRef<THREE.Object3D[] | null>(null);
  const [pendingPoints, setPendingPoints] = useState<THREE.Vector3[]>([]);
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const active = isMeasuring && measurementMode === 'angle';

  useEffect(() => {
    if (!active) {
      pointsRef.current = [];
      meshCacheRef.current = null;
      return;
    }
    const canvas = gl.domElement;
    const onClick = (e: MouseEvent) => {
      const pt = pickPoint(e, canvas, raycaster, camera, scene, meshCacheRef);
      const next = [...pointsRef.current, pt];
      if (next.length === 3) {
        addAngleMeasurement([
          [next[0].x, next[0].y, next[0].z],
          [next[1].x, next[1].y, next[1].z],
          [next[2].x, next[2].y, next[2].z],
        ]);
        pointsRef.current = [];
        setPendingPoints([]);
      } else {
        pointsRef.current = next;
        setPendingPoints(next);
      }
      tick();
    };
    canvas.addEventListener('click', onClick);
    return () => canvas.removeEventListener('click', onClick);
  }, [active, raycaster, camera, gl, scene, addAngleMeasurement]);

  const HINT = ['起点', '顶点', '终点'];

  return (
    <>
      {active && pendingPoints.map((p, i) => (
        <group key={i}>
          <mesh position={[p.x, p.y, p.z]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#ff8800" />
          </mesh>
          <Html position={[p.x, p.y+0.35, p.z]} center>
            <div className="bg-orange-900/90 text-orange-300 px-2 py-1 rounded text-xs whitespace-nowrap border border-orange-600">
              {HINT[i]} 已选
            </div>
          </Html>
          {i > 0 && (() => {
            const prev = pendingPoints[i - 1];
            const linePos = new Float32Array([prev.x, prev.y, prev.z, p.x, p.y, p.z]);
            return (
              <lineSegments>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#ff8800" />
              </lineSegments>
            );
          })()}
        </group>
      ))}
      {angleMeasurements.map((m) => {
        const [p1, vertex, p2] = m.points.map((p) => new THREE.Vector3(...p));
        const labelPos = p1.clone().lerp(p2, 0.5).lerp(vertex, 0.3);
        const pos1 = new Float32Array([p1.x, p1.y, p1.z, vertex.x, vertex.y, vertex.z]);
        const pos2 = new Float32Array([vertex.x, vertex.y, vertex.z, p2.x, p2.y, p2.z]);
        return (
          <group key={m.id}>
            {[p1, vertex, p2].map((p, i) => (
              <mesh key={i} position={[p.x, p.y, p.z]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                <meshBasicMaterial color={i === 1 ? '#ff4400' : '#ff8800'} />
              </mesh>
            ))}
            <lineSegments>
              <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos1, 3]} /></bufferGeometry>
              <lineBasicMaterial color="#ff8800" />
            </lineSegments>
            <lineSegments>
              <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos2, 3]} /></bufferGeometry>
              <lineBasicMaterial color="#ff8800" />
            </lineSegments>
            <Html position={[labelPos.x, labelPos.y+0.4, labelPos.z]} center>
              <div className="flex items-center gap-1 bg-gray-900/90 border border-orange-400 text-orange-300 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                <span>{m.angle.toFixed(1)}°</span>
                <button onClick={() => removeAngleMeasurement(m.id)} className="text-gray-400 hover:text-red-400 ml-1">x</button>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
};

export const MeasurementTool: React.FC = () => {
  const { isMeasuring, measurements, areaMeasurements, angleMeasurements } = useStore();
  const hasContent = measurements.length > 0 || areaMeasurements.length > 0 || angleMeasurements.length > 0;
  if (!isMeasuring && !hasContent) return null;
  return (
    <>
      <DistanceLayer />
      <AreaLayer />
      <AngleLayer />
    </>
  );
};
