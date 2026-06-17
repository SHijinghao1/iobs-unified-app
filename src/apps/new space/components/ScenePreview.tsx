import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from '@react-three/drei';

const OperatingRoomScene = React.lazy(() =>
  import('../scenes/OperatingRoom').then((m) => ({ default: m.OperatingRoomScene }))
);

const BEAM_RESTRICTOR_URL = `${import.meta.env.BASE_URL}models/束光器.stl`;

function BeamRestrictorModel({ beamCoords }: { beamCoords?: { p1x: number; p1y: number; p2x: number; p2y: number; p3x: number; p3y: number; p4x: number; p4y: number } }) {
  const geom = useLoader(STLLoader, BEAM_RESTRICTOR_URL);
  geom.computeVertexNormals();
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xe8ecf2,
    roughness: 0.15,
    metalness: 0.85,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  }), []);

  // 顶部/底部缩放比例（顶部比底部大）
  const scale = 2.75;
  
  // 4个底部顶点（直接使用实际坐标值，x和z为水平坐标）
  const b1x = beamCoords?.p1x ?? -0.28;
  const b1y = 2.1;
  const b1z = beamCoords?.p1y ?? -0.28;
  
  const b2x = beamCoords?.p2x ?? 0.28;
  const b2y = 2.1;
  const b2z = beamCoords?.p2y ?? -0.28;
  
  const b3x = beamCoords?.p3x ?? -0.28;
  const b3y = 2.1;
  const b3z = beamCoords?.p3y ?? 0.28;
  
  const b4x = beamCoords?.p4x ?? 0.28;
  const b4y = 2.1;
  const b4z = beamCoords?.p4y ?? 0.28;

  // 底部中心点
  const centerX = (b1x + b2x + b3x + b4x) / 4;
  const centerZ = (b1z + b2z + b3z + b4z) / 4;

  // 光束几何体 - 梯形（顶部在玻璃墙上，底部在模型上）
  const beamGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    
    const topY = -0.01;
    
    // 顶部4个顶点（从中心等比例放大）
    const t1x = centerX + (b1x - centerX) * scale;
    const t1z = centerZ + (b1z - centerZ) * scale;
    const t2x = centerX + (b2x - centerX) * scale;
    const t2z = centerZ + (b2z - centerZ) * scale;
    const t3x = centerX + (b3x - centerX) * scale;
    const t3z = centerZ + (b3z - centerZ) * scale;
    const t4x = centerX + (b4x - centerX) * scale;
    const t4z = centerZ + (b4z - centerZ) * scale;
    
    const vertices = new Float32Array([
      // 底部四个顶点
      b1x, b1y, b1z,
      b2x, b2y, b2z,
      b4x, b4y, b4z,
      b3x, b3y, b3z,
      // 顶部四个顶点（等比例）
      t1x, topY, t1z,
      t2x, topY, t2z,
      t4x, topY, t4z,
      t3x, topY, t3z,
    ]);
    
    const indices = new Uint16Array([
      0, 1, 2,  0, 2, 3,
      4, 6, 5,  4, 7, 6,
      0, 4, 5,  0, 5, 1,
      2, 6, 7,  2, 7, 3,
      3, 7, 4,  3, 4, 0,
      1, 5, 6,  1, 6, 2,
    ]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // 顶点颜色：底部蓝色，顶部白色（蓝白渐变）
    const bottomColor = new THREE.Color(0x88ddff);
    const topColor = new THREE.Color(0xffffff);
    const colors = new Float32Array(8 * 3); // 8个顶点，每个RGB
    for (let i = 0; i < 4; i++) {
      // 底部4个顶点 - 蓝色
      colors[i * 3]     = bottomColor.r;
      colors[i * 3 + 1] = bottomColor.g;
      colors[i * 3 + 2] = bottomColor.b;
    }
    for (let i = 4; i < 8; i++) {
      // 顶部4个顶点 - 白色
      colors[i * 3]     = topColor.r;
      colors[i * 3 + 1] = topColor.g;
      colors[i * 3 + 2] = topColor.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 每个顶点的透明度
    const alphas = new Float32Array([
      0.35, 0.35, 0.35, 0.35,   // 底部深
      0.15, 0.15, 0.15, 0.15,   // 顶部浅（但可见）
    ]);
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    
    return geometry;
  }, [b1x, b1y, b1z, b2x, b2y, b2z, b3x, b3y, b3z, b4x, b4y, b4z, centerX, centerZ, scale]);

  return (
    <group position={[1, 0, 0]} rotation={[Math.PI, Math.PI / 2, 0]}>
      <mesh geometry={geom} material={material} scale={0.012} />
      <mesh position={[-0.5, -1.0, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 64]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0}
          metalness={0}
          transmission={0.95}
          thickness={0.1}
          ior={1.5}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 光束 - 顶部四个顶点在玻璃墙上，底深上浅渐变 */}
      <mesh geometry={beamGeometry} position={[-0.5, -1.0, -2.15]}>
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={`
            attribute float aAlpha;
            varying float vAlpha;
            varying vec3 vColor;
            attribute vec3 color;
            void main() {
              vAlpha = aAlpha;
              vColor = color;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying float vAlpha;
            varying vec3 vColor;
            void main() {
              gl_FragColor = vec4(vColor, vAlpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

function OrbitCamera() {
  const { camera } = useThree();
  const angle = useRef(0);

  useFrame((_, delta) => {
    angle.current += delta * 0.5;
    const radius = 3.5;
    const height = 2.5;
    camera.position.x = Math.cos(angle.current) * radius;
    camera.position.z = Math.sin(angle.current) * radius;
    camera.position.y = height + Math.sin(angle.current * 0.5) * 1.3;
    camera.lookAt(1, 0, 0);
  });

  return null;
}

function MiniLighting() {
  return (
    <>
      <ambientLight intensity={2} />
      <hemisphereLight args={['#ffffff', '#444466', 1.5]} />
      <directionalLight position={[3, 8, 4]} intensity={3} />
      <directionalLight position={[-3, 4, -2]} intensity={2} color="#d4e4f4" />
      <pointLight position={[1, 3, 2]} intensity={3} color="#ffffff" distance={10} />
      <pointLight position={[1, 0, -3]} intensity={2} color="#aaccff" distance={8} />
    </>
  );
}

function SetCameraOnce({ position }: { position: [number, number, number] }) {
  const { camera } = useThree();
  const set = useRef(false);
  if (!set.current) {
    camera.position.set(...position);
    set.current = true;
  }
  return null;
}

export default function ScenePreview({ 
  hideModels = false,
  beamCoords 
}: { 
  hideModels?: boolean;
  beamCoords?: { p1x: number; p1y: number; p2x: number; p2y: number; p3x: number; p3y: number; p4x: number; p4y: number };
}) {
  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(180deg,#1a2533 0%,#2d4054 50%,#5a728a 100%)' }}>
      <Canvas
        shadows={false}
        camera={{ position: hideModels ? [3, 2, 4] : [5, 2, 0], fov: 45, near: 0.5, far: 150 }}
        dpr={[0.6, 1]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
          alpha: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <MiniLighting />
        {!hideModels ? (
          <OrbitCamera />
        ) : (
          <>
            <SetCameraOnce position={[1, 2, 3]} />
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.12}
              minDistance={0.1}
              maxDistance={50}
              minPolarAngle={-Math.PI}
              maxPolarAngle={Math.PI * 2}
              minAzimuthAngle={-Infinity}
              maxAzimuthAngle={Infinity}
              target={[-1, 0, -0.5]}
            />
          </>
        )}
        {!hideModels && (
          <React.Suspense fallback={null}>
            <OperatingRoomScene />
          </React.Suspense>
        )}
        {hideModels && (
          <React.Suspense fallback={null}>
            <BeamRestrictorModel beamCoords={beamCoords} />
          </React.Suspense>
        )}
      </Canvas>
    </div>
  );
}
