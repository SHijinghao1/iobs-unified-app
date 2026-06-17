import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';

// 视图立方体：用来快速切换观察方向，并跟随相机姿态更新。

type ViewCubeCameraChangeDetail = {
  position: [number, number, number];
  target: [number, number, number];
};

type ViewFace = {
  id: string;
  label: string;
  // Direction from target -> camera.
  dir: [number, number, number];
};

type GlobalCameraState = {
  position: [number, number, number];
  target: [number, number, number];
};

const VIEW_CUBE_CAMERA_CHANGE_EVENT = 'view-cube-camera-change';

const FACES: ViewFace[] = [
  { id: 'front',  label: '前', dir: [0, 0, 1] },
  { id: 'back',   label: '后', dir: [0, 0, -1] },
  { id: 'left',   label: '左', dir: [-1, 0, 0] },
  { id: 'right',  label: '右', dir: [1, 0, 0] },
  { id: 'top',    label: '上', dir: [0, 1, 0] },
  { id: 'bottom', label: '下', dir: [0, -1, 0] },
];

export const ViewCubeTool: React.FC = () => {
  const cameraPosition = useStore((s) => s.cameraPosition);
  const cameraTarget = useStore((s) => s.cameraTarget);
  const setCameraView = useStore((s) => s.setCameraView);
  const addToast = useStore((s) => s.addToast);

  const [rotX, setRotX] = useState(-22);
  const [rotY, setRotY] = useState(45);
  const lastFollowStateRef = useRef<GlobalCameraState | null>(null);
  const dragRef = useRef<{ active: boolean; x: number; y: number; startX: number; startY: number }>({ active: false, x: 0, y: 0, startX: 0, startY: 0 });
  const movedRef = useRef(false);
  const lastDragEndAtRef = useRef(0);
  const manualOverrideRef = useRef(false);

  const applyFollowRotation = (position: [number, number, number], target: [number, number, number]) => {
    const dx = position[0] - target[0];
    const dy = position[1] - target[1];
    const dz = position[2] - target[2];
    const horizontal = Math.hypot(dx, dz);

    // CSS 3D cube 的 Y 轴视觉方向与场景相机方位相反，
    // 跟随显示时需要对水平角取反，否则左右会表现成镜像。
    const nextRotY = -Math.atan2(dx, dz) * (180 / Math.PI);
    const nextRotX = -Math.atan2(dy, Math.max(horizontal, 0.0001)) * (180 / Math.PI);

    setRotY(nextRotY);
    setRotX(Math.max(-89, Math.min(89, nextRotX)));
  };

  useEffect(() => {
    const syncFromState = (position: [number, number, number], target: [number, number, number]) => {
      const nextState: GlobalCameraState = { position, target };
      const prevState = lastFollowStateRef.current;
      const unchanged = prevState &&
        prevState.position[0] === nextState.position[0] &&
        prevState.position[1] === nextState.position[1] &&
        prevState.position[2] === nextState.position[2] &&
        prevState.target[0] === nextState.target[0] &&
        prevState.target[1] === nextState.target[1] &&
        prevState.target[2] === nextState.target[2];

      if (unchanged || manualOverrideRef.current) return;
      lastFollowStateRef.current = nextState;
      applyFollowRotation(position, target);
    };

    syncFromState(cameraPosition, cameraTarget);

    const handleViewCubeCameraChange = (event: Event) => {
      const customEvent = event as CustomEvent<ViewCubeCameraChangeDetail>;
      if (!customEvent.detail) return;
      syncFromState(customEvent.detail.position, customEvent.detail.target);
    };

    window.addEventListener(VIEW_CUBE_CAMERA_CHANGE_EVENT, handleViewCubeCameraChange as EventListener);

    return () => {
      window.removeEventListener(VIEW_CUBE_CAMERA_CHANGE_EVENT, handleViewCubeCameraChange as EventListener);
    };
  }, [cameraPosition, cameraTarget]);

  const distance = useMemo(() => {
    const dx = cameraPosition[0] - cameraTarget[0];
    const dy = cameraPosition[1] - cameraTarget[1];
    const dz = cameraPosition[2] - cameraTarget[2];
    return Math.hypot(dx, dy, dz);
  }, [cameraPosition, cameraTarget]);

  const safeDistance = distance > 0.0001 ? distance : 15;
  const size = 82;
  const half = size / 2;

  const applyView = (face: ViewFace) => {
    const [tx, ty, tz] = cameraTarget;
    const [dx, dy, dz] = face.dir;
    const nextPos: [number, number, number] = [
      tx + dx * safeDistance,
      ty + dy * safeDistance,
      tz + dz * safeDistance,
    ];

    setCameraView(nextPos, cameraTarget);
    addToast(`视角切换: ${face.label}`, 'info');
  };

  const flipToOpposite = () => {
    const [tx, ty, tz] = cameraTarget;
    const nextPos: [number, number, number] = [
      tx * 2 - cameraPosition[0],
      ty * 2 - cameraPosition[1],
      tz * 2 - cameraPosition[2],
    ];
    setCameraView(nextPos, cameraTarget);
    addToast('视角切换: 对面', 'info');
  };

  const onFaceClick = (face: ViewFace) => {
    if (Date.now() - lastDragEndAtRef.current < 150) return;

    const drag = dragRef.current;
    const totalMove = Math.abs(drag.x - drag.startX) + Math.abs(drag.y - drag.startY);
    if (movedRef.current || totalMove > 4) return;

    manualOverrideRef.current = false;
    applyView(face);
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 2) return;

    manualOverrideRef.current = true;
    dragRef.current = {
      active: true,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
    };
    movedRef.current = false;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragRef.current.active) return;

    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;

    if (Math.abs(dx) + Math.abs(dy) > 2) {
      movedRef.current = true;
    }

    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;

    setRotY((prev) => prev + dx * 0.6);
    setRotX((prev) => Math.max(-89, Math.min(89, prev - dy * 0.6)));

    e.preventDefault();
  };

  const finishDrag = (el: HTMLDivElement, pointerId: number) => {
    dragRef.current.active = false;
    lastDragEndAtRef.current = Date.now();

    if (el.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId);
    }

    dragRef.current.startX = dragRef.current.x;
    dragRef.current.startY = dragRef.current.y;

    setTimeout(() => {
      movedRef.current = false;
      manualOverrideRef.current = false;
    }, 120);
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragRef.current.active) return;
    finishDrag(e.currentTarget as HTMLDivElement, e.pointerId);
  };

  const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
    finishDrag(e.currentTarget as HTMLDivElement, e.pointerId);
  };

  const faceClass =
    'absolute inset-0 flex items-center justify-center rounded-lg border border-neon-cyan/40 bg-[#00ffff12] text-[11px] font-bold text-neon-cyan hover:bg-[#00ffff24] transition-colors select-none';

  return (
    <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
      <div className="flex flex-col items-center gap-2">
        <div
          data-view-cube-root
          style={{ width: size, height: size, perspective: 900 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="cursor-grab active:cursor-grabbing select-none"
        >
          <div
            style={{
              position: 'relative',
              width: size,
              height: size,
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            }}
          >
            <button
              type="button"
              aria-label="切换到前视角"
              onClick={() => onFaceClick(FACES[0])}
              style={{ transform: `rotateY(0deg) translateZ(${half}px)`, backfaceVisibility: 'hidden' }}
              className={faceClass}
            >
              前
            </button>

            <button
              type="button"
              aria-label="切换到后视角"
              onClick={() => onFaceClick(FACES[1])}
              style={{ transform: `rotateY(180deg) translateZ(${half}px)`, backfaceVisibility: 'hidden' }}
              className={faceClass}
            >
              后
            </button>

            <button
              type="button"
              aria-label="切换到左视角"
              onClick={() => onFaceClick(FACES[2])}
              style={{ transform: `rotateY(-90deg) translateZ(${half}px)`, backfaceVisibility: 'hidden' }}
              className={faceClass}
            >
              左
            </button>

            <button
              type="button"
              aria-label="切换到右视角"
              onClick={() => onFaceClick(FACES[3])}
              style={{ transform: `rotateY(90deg) translateZ(${half}px)`, backfaceVisibility: 'hidden' }}
              className={faceClass}
            >
              右
            </button>

            <button
              type="button"
              aria-label="切换到俯视角"
              onClick={() => onFaceClick(FACES[4])}
              style={{ transform: `rotateX(90deg) translateZ(${half}px)`, backfaceVisibility: 'hidden' }}
              className={faceClass}
            >
              上
            </button>

            <button
              type="button"
              aria-label="切换到仰视角"
              onClick={() => onFaceClick(FACES[5])}
              style={{ transform: `rotateX(-90deg) translateZ(${half}px)`, backfaceVisibility: 'hidden' }}
              className={faceClass}
            >
              下
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-label="翻转到对面视角"
          onClick={flipToOpposite}
          className="px-2.5 py-1 rounded-md border border-neon-cyan/50 bg-neon-cyan/10 text-[10px] font-bold text-neon-cyan hover:bg-neon-cyan/20 transition-colors"
        >
          对面
        </button>
      </div>
    </div>
  );
};
