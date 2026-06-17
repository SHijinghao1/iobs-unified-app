/**
 * @file ThreeScenePanel.tsx
 * @description 3D场景面板组件，负责渲染3D手术室场景
 * @author IOBS Team
 * @date 2024-01-01
 */

import React, { Suspense, useEffect } from 'react';

import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

const OperatingRoomScene = React.lazy(() =>
  import('../scenes/OperatingRoom').then((m) => ({ default: m.OperatingRoomScene }))
);

function ProceduralEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    scene.background = null;

    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x3a4d60);

    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    envScene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight1.position.set(5, 8, 6);
    envScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd4e4f4, 1.5);
    dirLight2.position.set(-3, 4, -5);
    envScene.add(dirLight2);

    const fillLight = new THREE.PointLight(0xf0f4f8, 0.8);
    fillLight.position.set(0, -3, 2);
    envScene.add(fillLight);

    const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
    const prevEnvironment = scene.environment;
    scene.environment = renderTarget.texture;

    return () => {
      scene.environment = prevEnvironment;
      renderTarget.texture.dispose();
      renderTarget.dispose();
      pmremGenerator.dispose();
      envScene.remove(ambient, dirLight1, dirLight2, fillLight);
    };
  }, [gl, scene]);

  return null;
}

function LightingSetup() {
  return (
    <>
      <ProceduralEnvironment />
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.5}
        color="#ffffff"
      />
      <directionalLight
        position={[-4, 3, -3]}
        intensity={0.5}
        color="#d4e4f4"
      />
    </>
  );
}

export default function ThreeScenePanel() {
  const cameraPosition: [number, number, number] = [4, 1, -4];

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a2533 0%, #2d4054 30%, #5a728a 70%, #8fa8c0 100%)' }}>
      <Canvas
        shadows={false}
        camera={{ position: cameraPosition, fov: 50, near: 0.5, far: 150 }}
        dpr={[0.5, 1]}
        frameloop="demand"
        performance={{ min: 0.5 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
          stencil: false,
          depth: true,
          alpha: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <LightingSetup />
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.7}
          scale={12}
          blur={1}
          far={4}
          color="#0a0a1a"
        />
        <Suspense fallback={null}>
          <OperatingRoomScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
