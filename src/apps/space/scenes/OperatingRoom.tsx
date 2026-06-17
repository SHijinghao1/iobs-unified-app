import React, { Suspense, useMemo, useRef, useEffect, lazy } from 'react';
import type { ElementRef, RefObject } from 'react';
import { Grid, OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../store';
import { URDFModel } from './URDFModel';
import type { LinkOffsets } from './URDFModel';
import {
  MM_TO_WORLD,
  C_ARM_HEIGHT_MIN,
  C_ARM_HEIGHT_MAX,
  DEG,
} from '../constants/machine';

// 手术间 3D 场景：负责组合手术床、C 臂、灯光和相机控制。

const MeasurementTool = lazy(() => import('../components/MeasurementTool').then((m) => ({ default: m.MeasurementTool })));
const AnnotationTool = lazy(() => import('../components/AnnotationTool').then((m) => ({ default: m.AnnotationTool })));

const VIEW_CUBE_CAMERA_CHANGE_EVENT = 'view-cube-camera-change';

const mapHeightJointToJ1 = (height: number) => {
  // 300mm 为低位 (0), 400mm (UI) 映射到 330mm (物理)，即 30% 的原行程
  const t = (height - C_ARM_HEIGHT_MIN) / (C_ARM_HEIGHT_MAX - C_ARM_HEIGHT_MIN);
  const clampedT = Math.max(0, Math.min(1, t));
  
  // 物理位移比例：0 到 0.3 (对应 300mm 到 330mm)
  const physicalT = clampedT * 0.3;
  
  // 根据 URDF: axis="-1 0 0"
  return -physicalT; 
};
const mmToWorld = (v: number) => v * MM_TO_WORLD;

// ── 运动检测 Hook：检测哪些部件正在运动并返回高亮列表 ───────────────────────────
const PART_TO_LINKS_MAP: Record<string, string[]> = {
  bed_height: ['bed_panel_mid', 'bed_panel_back', 'bed_panel_left_leg', 'bed_panel_right_leg', 'bed_enclosure_1', 'bed_enclosure_2', 'bed_enclosure_3', 'bed_enclosure_4', 'bed_front_back_link', 'bed_tilt_link', 'bed_lateral_link'],
  bed_trendelenburg: ['bed_panel_mid', 'bed_panel_back', 'bed_panel_left_leg', 'bed_panel_right_leg'],
  bed_lateral: ['bed_panel_mid', 'bed_panel_back', 'bed_panel_left_leg', 'bed_panel_right_leg'],
  bed_frontBackPosition: ['bed_panel_mid', 'bed_panel_back', 'bed_panel_left_leg', 'bed_panel_right_leg'],
  bed_backrestAngle: ['bed_panel_back'],
  bed_leftLegAngle: ['bed_panel_left_leg'],
  bed_rightLegAngle: ['bed_panel_right_leg'],
  carm_height: ['c_arm_column', 'c_arm_head_lower', 'c_arm_head', 'c_arm_ring_arm', 'c_arm_ring_no_arm'],
  carm_rotation: ['c_arm_ring_arm', 'c_arm_ring_no_arm'],
  carm_frontBackRotation: ['c_arm_ring_no_arm'],
  carm_frontBackTranslation: ['c_arm_head', 'c_arm_ring_arm', 'c_arm_ring_no_arm'],
};

const useHighlightFromInteraction = (
  interactingPart: string | null,
  interactionState: string
): string[] => {
  if (!interactingPart) return [];
  if (interactionState !== 'USER_INTERACTING') return [];
  return PART_TO_LINKS_MAP[interactingPart] || [];
};

const BED_VALUE_TO_PART_MAP: Record<string, string> = {
  height: 'bed_height',
  trendelenburg: 'bed_trendelenburg',
  lateral: 'bed_lateral',
  frontBackPosition: 'bed_frontBackPosition',
  backrestAngle: 'bed_backrestAngle',
  leftLegAngle: 'bed_leftLegAngle',
  rightLegAngle: 'bed_rightLegAngle',
};

const CARM_VALUE_TO_PART_MAP: Record<string, string> = {
  cArmHeightJoint: 'carm_height',
  cArmRotation: 'carm_rotation',
  cArmFrontBackRotation: 'carm_frontBackRotation',
  frontBackTranslation: 'carm_frontBackTranslation',
};

const EMPTY_OBJ = {};

const useBackendChangeHighlight = (
  bed: Record<string, number>,
  cArm: Record<string, number>,
  interactionState: string
): string[] => {
  const [highlightedLinks, setHighlightedLinks] = React.useState<string[]>([]);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdleBedRef = useRef<Record<string, number>>({});
  const lastIdleCArmRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (interactionState !== 'IDLE') {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      if (highlightedLinks.length > 0) setHighlightedLinks([]);
      Object.assign(lastIdleBedRef.current, bed);
      Object.assign(lastIdleCArmRef.current, cArm);
      return;
    }

    const changedParts = new Set<string>();

    Object.entries(bed).forEach(([key, val]) => {
      const prev = lastIdleBedRef.current[key];
      const roundedPrev = Math.round((prev ?? 0) * 10) / 10;
      const roundedVal = Math.round(val * 10) / 10;
      if (prev !== undefined && roundedPrev !== roundedVal) {
        const part = BED_VALUE_TO_PART_MAP[key];
        if (part) changedParts.add(part);
      }
      lastIdleBedRef.current[key] = val;
    });

    Object.entries(cArm).forEach(([key, val]) => {
      const prev = lastIdleCArmRef.current[key];
      const roundedPrev = Math.round((prev ?? 0) * 10) / 10;
      const roundedVal = Math.round(val * 10) / 10;
      if (prev !== undefined && roundedPrev !== roundedVal) {
        const part = CARM_VALUE_TO_PART_MAP[key];
        if (part) changedParts.add(part);
      }
      lastIdleCArmRef.current[key] = val;
    });

    if (changedParts.size > 0) {
      const links = new Set<string>();
      changedParts.forEach(part => {
        const partLinks = PART_TO_LINKS_MAP[part] || [];
        partLinks.forEach(l => links.add(l));
      });

      const nextLinks = Array.from(links);
      // 只有在内容真正变化时才更新，防止无限循环
      if (nextLinks.length !== highlightedLinks.length || nextLinks.some((l, i) => l !== highlightedLinks[i])) {
        setHighlightedLinks(nextLinks);

        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          setHighlightedLinks([]);
        }, 150);
      }
    }

    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, [bed, cArm, interactionState]); // eslint-disable-line react-hooks/exhaustive-deps

  return highlightedLinks;
};

// ── 场景中的标准摆位（供坐标面板等模块复用） ───────────────────────────────
export const STANDARD_POSITION = {
  bed: {
    position: { x: 2.2, y: 0.0, z: 0.0 },
  },
  cArm: {
    position:      { x: 0.0, y: 0.0, z: 0.0 },
    headOffset:    { x: 0, y: 0, z: 0 },
    cArmRingOffset: { x: 0, y: 0, z: 0 },
  },
} as const;

const MODEL_BASE_URL = `${import.meta.env.BASE_URL}models/`;
const URDF_BED_URL = `${MODEL_BASE_URL}urdf/surgical_bed_v2.urdf`;
const URDF_C_ARM_URL = `${MODEL_BASE_URL}urdf/c_arm.urdf`;

// ── 基于 URDF 的手术床模型 ───────────────────────────────────────────────────
export const URDFBed: React.FC = () => {
  const bed = useStore((s) => s.bed);
  const interactingPart = useStore((s) => s.interactingPart);
  const interactionState = useStore((s) => s.interactionState);

  const interactionHighlight = useHighlightFromInteraction(interactingPart, interactionState);
  const bedValues = useMemo(() => ({
    height: bed.height ?? 0,
    trendelenburg: bed.trendelenburg ?? 0,
    lateral: bed.lateral ?? 0,
    frontBackPosition: bed.frontBackPosition ?? 0,
    backrestAngle: bed.backrestAngle ?? 0,
    leftLegAngle: bed.leftLegAngle ?? 0,
    rightLegAngle: bed.rightLegAngle ?? 0,
  }), [bed.height, bed.trendelenburg, bed.lateral, bed.frontBackPosition, bed.backrestAngle, bed.leftLegAngle, bed.rightLegAngle]);
  
  const backendHighlight = useBackendChangeHighlight(bedValues, EMPTY_OBJ, interactionState);
  const highlightedLinks = useMemo(() => {
    const combined = new Set([...interactionHighlight, ...backendHighlight]);
    return Array.from(combined);
  }, [interactionHighlight, backendHighlight]);


  // 手术床下降量（毫米）：height 越小，下降越多
  const travelMaxMm = 390; // 统一总行程

  const panelDownMm = useMemo(() => {
    const heightMin = 1030;
    const heightMax = 1200;
    const clamped = Math.max(heightMin, Math.min(heightMax, bed.height || heightMin));
    const t = (heightMax - clamped) / (heightMax - heightMin);
    return -t * travelMaxMm;
  }, [bed.height]);

  // 围挡分段收缩：
  // 3 先到底（与 4 重合）-> 2 再到底（与 3/4 重合）-> 1 最后到底
  const enclosure3DownMm = useMemo(() => Math.max(-130, panelDownMm), [panelDownMm]);
  const enclosure2DownMm = useMemo(() => Math.max(-260, panelDownMm), [panelDownMm]);
  const enclosure1DownMm = useMemo(() => Math.max(-390, panelDownMm), [panelDownMm]);
  const frontBackWorld = useMemo(() => mmToWorld(bed.frontBackPosition ?? 0), [bed.frontBackPosition]);

  const platformTiltDeg = useMemo(() => {
    // 前后倾斜拉杆：优先取 trendelenburg，为 0 时再回退 frontBackTilt
    const t = bed.trendelenburg ?? 0;
    const fb = bed.frontBackTilt ?? 0;
    return Math.abs(t) > 1e-6 ? t : fb;
  }, [bed.trendelenburg, bed.frontBackTilt]);

  const platformLateralDeg = useMemo(() => {
    // 左右倾斜拉杆：优先取 lateral，为 0 时再回退 leftRightTilt
    const l = bed.lateral ?? 0;
    const lr = bed.leftRightTilt ?? 0;
    return Math.abs(l) > 1e-6 ? l : lr;
  }, [bed.lateral, bed.leftRightTilt]);

  const joints = useMemo(() => ({
    // 驱动 prismatic 关节
    // 注意：根据 URDF 定义与场景旋转，bed_front_back_joint 实际对应垂直升降(Y轴)，bed_height_joint 实际对应前后位移(Z轴)
    bed_front_back_joint: (function() {
      const heightMin = 1030;
      const heightMax = 1200;
      const current = bed.height || heightMin;
      const t = (current - heightMin) / (heightMax - heightMin); // 0 to 1
      // 映射到 URDF 的 Y 轴位移 (bed_front_back_joint axis="0 1 0")
      // 行程必须与 enclosure1DownMm 保持一致（390mm = 0.39 world units）
      return (t - 1) * mmToWorld(travelMaxMm); 
    })(),
    bed_height_joint:          frontBackWorld, // 驱动 URDF 的 Z 轴位移 (bed_height_joint axis="0 0 1")
    bed_panel_back_joint:      (bed.backrestAngle  || 0) * DEG,
    bed_panel_right_leg_joint: (bed.rightLegAngle  || 0) * DEG,
    bed_panel_left_leg_joint:  (bed.leftLegAngle   || 0) * DEG,
  }), [bed.height, frontBackWorld, bed.backrestAngle, bed.rightLegAngle, bed.leftLegAngle]);

  // 各链接的微调偏移
  const linkOffsets = useMemo((): LinkOffsets => ({
    // 第 1 部分：base_link
    base_link: {
      pos: { x: mmToWorld(bed.baseOffset?.x ?? 0), y: mmToWorld(bed.baseOffset?.y ?? 0), z: mmToWorld(bed.baseOffset?.z ?? 0) },
      rot: { x: bed.baseRotation?.x ?? 0, y: bed.baseRotation?.y ?? 0, z: bed.baseRotation?.z ?? 0 },
    },
    // 第 2 部分：bed_surface（v2 精简版 URDF 已移除，保留配置兼容）
    bed_surface: {
      pos: { x: mmToWorld(bed.surfaceOffset?.x ?? 0), y: mmToWorld(bed.surfaceOffset?.y ?? 0), z: mmToWorld(bed.surfaceOffset?.z ?? 0) },
      rot: { x: bed.surfaceRotation?.x ?? 0, y: bed.surfaceRotation?.y ?? 0, z: bed.surfaceRotation?.z ?? 0 },
    },
    // 第 3 部分：bed_panel_mid（床中间面板）
    bed_panel_mid: {
      pos: { 
        x: mmToWorld(bed.panelMidOffset?.x ?? 0), 
        y: mmToWorld(bed.panelMidOffset?.y ?? 0), // 移除 panelDownMm，交由 bed_height_joint 驱动
        z: mmToWorld(bed.panelMidOffset?.z ?? 0) // 移除 frontBackWorld，交由 bed_front_back_joint 驱动
      },
      rot: {
        x: (bed.panelMidRotation?.x ?? 0) + platformTiltDeg,
        y: bed.panelMidRotation?.y ?? 0,
        z: (bed.panelMidRotation?.z ?? 0) + platformLateralDeg,
      },
    },
    // 第 4 部分：bed_panel_right_leg（床面右腿板）
    bed_panel_right_leg: {
      pos: { x: mmToWorld(bed.panelRightLegOffset?.x ?? 0), y: mmToWorld((bed.panelRightLegOffset?.y ?? 0)), z: mmToWorld((bed.panelRightLegOffset?.z ?? 0)) },
      rot: { x: bed.panelRightLegRotation?.x ?? 0, y: bed.panelRightLegRotation?.y ?? 0, z: bed.panelRightLegRotation?.z ?? 0 },
    },
    // 第 5 部分：bed_panel_left_leg（床面左腿板）
    bed_panel_left_leg: {
      pos: { x: mmToWorld(bed.panelLeftLegOffset?.x ?? 0), y: mmToWorld((bed.panelLeftLegOffset?.y ?? 0)), z: mmToWorld((bed.panelLeftLegOffset?.z ?? 0)) },
      rot: { x: bed.panelLeftLegRotation?.x ?? 0, y: bed.panelLeftLegRotation?.y ?? 0, z: bed.panelLeftLegRotation?.z ?? 0 },
    },
    // 第 6 部分：bed_panel_back（床面背板）
    bed_panel_back: {
      pos: { x: mmToWorld(bed.panelBackOffset?.x ?? 0), y: mmToWorld((bed.panelBackOffset?.y ?? 0)), z: mmToWorld((bed.panelBackOffset?.z ?? 0)) },
      rot: { x: bed.panelBackRotation?.x ?? 0, y: bed.panelBackRotation?.y ?? 0, z: bed.panelBackRotation?.z ?? 0 },
    },
    // 围挡：分段下降，4 固定不动
    bed_enclosure_1: {
      pos: { x: 0, y: mmToWorld(enclosure1DownMm), z: 0 },
      rot: { x: 0, y: 0, z: 0 },
      // 设置为 0 表示禁用 LinkOffset 的二次平滑，直接跟随计算出的位置
      // 因为 enclosureDownMm 是基于 bed.height 计算的，而 bed.height 已经在 joint 驱动中平滑过了
      lerpFactor: 0, 
    },
    bed_enclosure_2: {
      pos: { x: 0, y: mmToWorld(enclosure2DownMm), z: 0 },
      rot: { x: 0, y: 0, z: 0 },
      lerpFactor: 0,
    },
    bed_enclosure_3: {
      pos: { x: 0, y: mmToWorld(enclosure3DownMm), z: 0 },
      rot: { x: 0, y: 0, z: 0 },
      lerpFactor: 0,
    },
    // bed_enclosure_4 不动（固定在 base_link）
  }), [
    panelDownMm,
    frontBackWorld,
    platformTiltDeg,
    platformLateralDeg,
    enclosure1DownMm,
    enclosure2DownMm,
    enclosure3DownMm,
    bed.baseOffset, bed.baseRotation,
    bed.surfaceOffset, bed.surfaceRotation,
    bed.panelMidOffset, bed.panelMidRotation,
    bed.panelRightLegOffset, bed.panelRightLegRotation,
    bed.panelLeftLegOffset, bed.panelLeftLegRotation,
    bed.panelBackOffset, bed.panelBackRotation,
    bed.enclosure1Offset, bed.enclosure2Offset, bed.enclosure3Offset,
  ]);

  const bedPosition: [number, number, number] = [
    1.2 + mmToWorld(bed.x || 0),
    0.0 + mmToWorld(bed.y || 0),
    0 + mmToWorld(bed.z || 0),
  ];

  const bedRotation: [number, number, number] = [
    ((bed.rotX || 0)) * DEG,
    (+90 + (bed.rotY || 0)) * DEG,
    0,
  ];


  return (
    <URDFModel
      urdfUrl={URDF_BED_URL}
      position={bedPosition}
      rotation={bedRotation}
      jointValues={joints}
      linkOffsets={linkOffsets}
      highlightedLinks={highlightedLinks}
      lerpFactor={0.35}
    />
  );
};

// ── 基于 URDF 的 C 臂模型 ─────────────────────────────────────────────────────
export const URDFCArm: React.FC = () => {
  const cArm = useStore((s) => s.cArm);
  const interactingPart = useStore((s) => s.interactingPart);
  const interactionState = useStore((s) => s.interactionState);

  const interactionHighlight = useHighlightFromInteraction(interactingPart, interactionState);
  const cArmValues = useMemo(() => ({
    cArmHeightJoint: cArm.cArmHeightJoint ?? 0,
    cArmRotation: cArm.cArmRotation ?? 0,
    cArmFrontBackRotation: cArm.cArmFrontBackRotation ?? 0,
    frontBackTranslation: cArm.frontBackTranslation ?? 0,
  }), [cArm.cArmHeightJoint, cArm.cArmRotation, cArm.cArmFrontBackRotation, cArm.frontBackTranslation]);
  const backendHighlight = useBackendChangeHighlight(EMPTY_OBJ, cArmValues, interactionState);
  const highlightedLinks = useMemo(() => {
    const combined = new Set([...interactionHighlight, ...backendHighlight]);
    return Array.from(combined);
  }, [interactionHighlight, backendHighlight]);


  const joints = useMemo(() => ({
    // 升降
    arm_height_joint: mapHeightJointToJ1(cArm.cArmHeightJoint ?? C_ARM_HEIGHT_MIN),
    // 斜臂旋转
    arm_tilt_joint: (cArm.cArmRotation || 0) * DEG,
    // C环滚动
    c_ring_rotation_joint: (cArm.cArmFrontBackRotation || 0) * DEG,
  }), [
    cArm.cArmHeightJoint,
    cArm.cArmRotation,
    cArm.cArmFrontBackRotation,
  ]);

  const frontBackWorld = mmToWorld(cArm.frontBackTranslation ?? 0);

  const linkOffsets = useMemo((): LinkOffsets => ({
    // c_arm_base
    c_arm_base: {
      pos: { x: mmToWorld(cArm.baseOffset?.x ?? 0), y: mmToWorld(cArm.baseOffset?.y ?? 0), z: mmToWorld(cArm.baseOffset?.z ?? 0) },
      rot: { x: cArm.baseRotation?.x ?? 0, y: cArm.baseRotation?.y ?? 0, z: cArm.baseRotation?.z ?? 0 },
    },
    // c_arm_column（升降筒）
    c_arm_column: {
      pos: { x: mmToWorld(cArm.columnOffset?.x ?? 0), y: mmToWorld(cArm.columnOffset?.y ?? 0), z: mmToWorld(cArm.columnOffset?.z ?? 0) },
      rot: { x: cArm.columnRotation?.x ?? 0, y: cArm.columnRotation?.y ?? 0, z: cArm.columnRotation?.z ?? 0 },
    },
    // c_arm_head_lower（头部下）
    c_arm_head_lower: {
      pos: {
        x: mmToWorld(cArm.headLowerOffset?.x ?? 0),
        y: mmToWorld(cArm.headLowerOffset?.y ?? 0),
        z: mmToWorld(cArm.headLowerOffset?.z ?? 0),
      },
      rot: { x: cArm.headLowerRotation?.x ?? 0, y: cArm.headLowerRotation?.y ?? 0, z: cArm.headLowerRotation?.z ?? 0 },
    },
    // c_arm_head（头部上，前后移动主驱动）
    c_arm_head: {
      pos: {
        x: mmToWorld(cArm.headOffset?.x ?? 0),
        y: mmToWorld(cArm.headOffset?.y ?? 0) + frontBackWorld,
        z: mmToWorld(cArm.headOffset?.z ?? 0),
      },
      rot: { x: cArm.headRotation?.x ?? 0, y: cArm.headRotation?.y ?? 0, z: cArm.headRotation?.z ?? 0 },
    },
    // c_arm_ring_arm（斜臂）
    c_arm_ring_arm: {
      pos: {
        x: mmToWorld(cArm.ringArmOffset?.x ?? 0) - 0.02,
        y: mmToWorld(cArm.ringArmOffset?.y ?? 0), 
        z: mmToWorld(cArm.ringArmOffset?.z ?? 0),
      },
      rot: { x: cArm.ringArmRotation?.x ?? 0, y: cArm.ringArmRotation?.y ?? 0, z: cArm.ringArmRotation?.z ?? 0 },
    },
    // c_arm_ring_no_arm（C环）
    c_arm_ring_no_arm: {
      pos: {
        x: mmToWorld(cArm.ringNoArmOffset?.x ?? 0),
        y: mmToWorld(cArm.ringNoArmOffset?.y ?? 0), 
        z: mmToWorld(cArm.ringNoArmOffset?.z ?? 0),
      },
      rot: { x: cArm.ringNoArmRotation?.x ?? 0, y: cArm.ringNoArmRotation?.y ?? 0, z: cArm.ringNoArmRotation?.z ?? 0 },
    },
  }), [
    cArm.baseOffset, cArm.baseRotation,
    cArm.columnOffset, cArm.columnRotation,
    cArm.headLowerOffset, cArm.headLowerRotation,
    cArm.headOffset, cArm.headRotation,
    cArm.ringArmOffset, cArm.ringArmRotation,
    cArm.ringNoArmOffset, cArm.ringNoArmRotation,
    frontBackWorld,
  ]);

  return (
    <>
      <URDFModel
      urdfUrl={URDF_C_ARM_URL}
      position={[
        -1 + mmToWorld(cArm.x || 0),
        0.0 + mmToWorld(cArm.y || 0),
        0 + mmToWorld(cArm.z || 0),
      ]}
      rotation={[
        0,
        90 * DEG,
        0,
      ]}
      jointValues={joints}
      linkOffsets={linkOffsets}
      highlightedLinks={highlightedLinks}
      lerpFactor={0.5}
    />
    </>
  );
};

// ── 相机控制器 ─────────────────────────────────────────────────────────────
// Write to store at a conservative rate so camera-driven UI stays responsive
const CAMERA_WRITE_INTERVAL = 0.2; // seconds
const CAMERA_POSITION_EPSILON = 0.12;
const CAMERA_TARGET_EPSILON = 0.08;

type OrbitLike = Pick<ElementRef<typeof OrbitControls>, 'target' | 'update'>;

const CameraController: React.FC<{ orbitRef: RefObject<OrbitLike | null> }> = ({ orbitRef }) => {
  const cameraPosition    = useStore((s) => s.cameraPosition);
  const cameraTarget      = useStore((s) => s.cameraTarget);
  const isResettingCamera = useStore((s) => s.isResettingCamera);
  const updateCameraPosition = useStore((s) => s.updateCameraPosition);

  const { camera } = useThree();
  const lastWriteTimer = useRef(0);
  const lastPos        = useRef([0, 0, 0]);
  const lastTarget     = useRef([0, 0, 0]);
  const suppressWriteRef = useRef(false);

  useEffect(() => {
    if (!isResettingCamera) return;
    suppressWriteRef.current = true;
    lastPos.current = [cameraPosition[0], cameraPosition[1], cameraPosition[2]];
    lastTarget.current = [cameraTarget[0], cameraTarget[1], cameraTarget[2]];
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    if (orbitRef.current) {
      orbitRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
      orbitRef.current.update();
    }

    window.dispatchEvent(new CustomEvent(VIEW_CUBE_CAMERA_CHANGE_EVENT, {
      detail: {
        position: [cameraPosition[0], cameraPosition[1], cameraPosition[2]] as [number, number, number],
        target: [cameraTarget[0], cameraTarget[1], cameraTarget[2]] as [number, number, number],
      },
    }));

    const t = setTimeout(() => { suppressWriteRef.current = false; }, 1200);
    return () => clearTimeout(t);
  }, [isResettingCamera, cameraPosition, cameraTarget, camera, orbitRef]);

  useFrame((_, delta) => {
    if (suppressWriteRef.current) return;
    lastWriteTimer.current += delta;
    if (lastWriteTimer.current < CAMERA_WRITE_INTERVAL) return;
    lastWriteTimer.current = 0;

    const x = camera.position.x;
    const y = camera.position.y;
    const z = camera.position.z;
    const target = orbitRef.current?.target;
    const tx = target?.x ?? cameraTarget[0];
    const ty = target?.y ?? cameraTarget[1];
    const tz = target?.z ?? cameraTarget[2];

    const posDelta =
      Math.abs(x - lastPos.current[0]) +
      Math.abs(y - lastPos.current[1]) +
      Math.abs(z - lastPos.current[2]);

    const targetDelta =
      Math.abs(tx - lastTarget.current[0]) +
      Math.abs(ty - lastTarget.current[1]) +
      Math.abs(tz - lastTarget.current[2]);

    if (posDelta < CAMERA_POSITION_EPSILON && targetDelta < CAMERA_TARGET_EPSILON) return;

    lastPos.current = [x, y, z];
    lastTarget.current = [tx, ty, tz];
    updateCameraPosition([x, y, z], [tx, ty, tz]);
  });

  return null;
};

// ── OperatingRoomScene ────────────────────────────────────────────────────────
export const OperatingRoomScene: React.FC = () => {
  const orbitRef = useRef<ElementRef<typeof OrbitControls> | null>(null);
  const { invalidate, gl, camera } = useThree();
  const isMeasuring = useStore((s) => s.isMeasuring);
  const isAnnotating = useStore((s) => s.isAnnotating);
  const showBedModelInScene = useStore((s) => s.showBedModelInScene);
  const showCArmModelInScene = useStore((s) => s.showCArmModelInScene);
  const setSceneInteracting = useStore((s) => s.setSceneInteracting);
  const lockOrbit = isMeasuring || isAnnotating;

  useEffect(() => {
    const canvas = gl.domElement;
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      setSceneInteracting(false);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [gl, setSceneInteracting]);

  const emitRafRef = useRef<number | null>(null);

  const emitViewCubeCameraChange = () => {
    if (emitRafRef.current !== null) return;
    emitRafRef.current = requestAnimationFrame(() => {
      emitRafRef.current = null;
      const target = orbitRef.current?.target;
      const detail = {
        position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
        target: [
          target?.x ?? 0,
          target?.y ?? 0,
          target?.z ?? 0,
        ] as [number, number, number],
      };

      window.dispatchEvent(new CustomEvent(VIEW_CUBE_CAMERA_CHANGE_EVENT, { detail }));
    });
  };

  useEffect(() => {
    return () => {
      if (emitRafRef.current !== null) {
        cancelAnimationFrame(emitRafRef.current);
        emitRafRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Lighting - optimised: no shadows, fewer lights */}
      <ambientLight intensity={1.6} color="#ffffff" />
      <directionalLight position={[0, 25, 2]} intensity={1.8} color="#ffffff" />
      <hemisphereLight args={[0xffffff, 0x889aaa, 0.6]} />

      {/* Floor grid - reduced size for performance */}
      <Grid
        args={[6, 6]} position={[0, -0.01, 0]}
        cellSize={0.02} cellThickness={0.4} cellColor="#4d9fff"
        sectionSize={0.24} sectionThickness={0.7} sectionColor="#00aaff"
        fadeDistance={5} fadeStrength={1.1}
      />

      <Suspense fallback={null}>
        {showBedModelInScene ? <URDFBed /> : null}
        {showCArmModelInScene ? <URDFCArm /> : null}
      </Suspense>

      <Suspense fallback={null}>
        <MeasurementTool />
        <AnnotationTool />
      </Suspense>
      <CameraController orbitRef={orbitRef} />
      <OrbitControls
        ref={orbitRef} makeDefault enableDamping dampingFactor={0.12}
        enableRotate={!lockOrbit}
        enablePan={!lockOrbit}
        enableZoom={!lockOrbit}
        minDistance={0.6} maxDistance={18} maxPolarAngle={Math.PI / 1.8}
        target={[0, 0.6, 0]} regress
        onStart={() => setSceneInteracting(true)}
        onEnd={() => setSceneInteracting(false)}
        onChange={() => {
          invalidate();
          emitViewCubeCameraChange();
        }}
      />

      {/* 临时坐标轴：左下角 XYZ */}
      <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
        <GizmoViewport rotation={[0, 90 * DEG, 0]} axisColors={['#ff4d4f', '#52c41a', '#1677ff']} labelColor="white" />
      </GizmoHelper>
    </>
  );
};
