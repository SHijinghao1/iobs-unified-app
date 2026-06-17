import React, { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

// 标注工具：支持在场景中落点并填写说明文字。

export const AnnotationTool: React.FC = () => {
  const { isAnnotating, annotations, addAnnotation, removeAnnotation } = useStore();
  const { raycaster: rc, camera: cam, gl: glCtx, scene: sc } = useThree();
  const [pendingPos, setPendingPos] = useState<[number,number,number] | null>(null);
  const [inputText, setInputText] = useState('');
  const meshCacheRef = useRef<THREE.Object3D[] | null>(null);

  React.useEffect(() => {
    if (!isAnnotating) {
      setPendingPos(null);
      setInputText('');
      meshCacheRef.current = null;
      return;
    }

    const canvas = glCtx.domElement;

    const onClick = (e: MouseEvent) => {
      // If there's already a pending position (input dialog open), ignore canvas click
      if (pendingPos !== null) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      rc.setFromCamera(new THREE.Vector2(x, y), cam);

      const getMeshes = () => {
        if (meshCacheRef.current) return meshCacheRef.current;
        const meshes: THREE.Object3D[] = [];
        sc.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) meshes.push(obj);
        });
        meshCacheRef.current = meshes;
        return meshes;
      };

      let hits = rc.intersectObjects(getMeshes(), true);

      // 模型可能晚于工具激活加载，首次空命中时重建缓存再试
      if (hits.length === 0) {
        meshCacheRef.current = null;
        hits = rc.intersectObjects(getMeshes(), true);
      }
      let hitPoint: THREE.Vector3;
      if (hits.length > 0) {
        hitPoint = hits[0].point.clone();
      } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        hitPoint = new THREE.Vector3();
        rc.ray.intersectPlane(plane, hitPoint);
      }

      setPendingPos([hitPoint.x, hitPoint.y, hitPoint.z]);
    };

    canvas.addEventListener('click', onClick);
    return () => canvas.removeEventListener('click', onClick);
  }, [isAnnotating, pendingPos, rc, cam, glCtx, sc]);

  const confirmAnnotation = () => {
    if (pendingPos && inputText.trim()) {
      addAnnotation(pendingPos, inputText.trim(), '#00ffff');
    }
    setPendingPos(null);
    setInputText('');
  };

  const cancelAnnotation = () => {
    setPendingPos(null);
    setInputText('');
  };

  return (
    <>
      {/* Pending annotation input */}
      {pendingPos && (
        <Html position={pendingPos} center>
          <div className="bg-gray-900/95 border border-neon-cyan rounded-lg p-3 shadow-xl w-52" onClick={(e) => e.stopPropagation()}>
            <p className="text-neon-cyan text-xs font-bold mb-2">添加标注</p>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入标注内容..."
              className="w-full bg-gray-800 text-white rounded p-2 text-xs resize-none border border-gray-700 focus:border-neon-cyan focus:outline-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button onClick={confirmAnnotation}
                className="flex-1 py-1.5 bg-neon-cyan text-black rounded font-bold text-xs hover:bg-neon-cyan/80">确认</button>
              <button onClick={cancelAnnotation}
                className="flex-1 py-1.5 bg-gray-700 text-white rounded font-bold text-xs hover:bg-gray-600">取消</button>
            </div>
          </div>
        </Html>
      )}

      {/* Placed annotations */}
      {annotations.map((a) => (
        <group key={a.id} position={a.position}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={a.color || '#00ffff'} />
          </mesh>
          <Html position={[0, 0.3, 0]} center>
            <div className="bg-gray-900/90 border border-gray-600 rounded-lg px-3 py-2 max-w-[160px]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: a.color || '#00ffff' }} />
                <button onClick={() => removeAnnotation(a.id)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
              </div>
              <p className="text-white text-xs leading-relaxed mt-1 break-words">{a.text}</p>
            </div>
          </Html>
        </group>
      ))}
    </>
  );
};
