/**
 * @file OperatingRoom.tsx
 * @description 手术室3D场景组件，负责渲染手术床和C臂模型
 * @author IOBS Team
 * @date 2024-01-01
 */

import React, { Suspense, useMemo, useRef, useEffect, lazy } from 'react';
import type { ElementRef, RefObject } from 'react';

import { Grid, OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

import { useSceneBridgeStore as useStore } from './sceneBridge';
import { URDFModel } from './URDFModel';
import type { LinkOffsets, LinkMaterialMap, EnclosureFaceMaterials } from './URDFModel';
import { MM_TO_WORLD, C_ARM_HEIGHT_MIN, C_ARM_HEIGHT_MAX, DEG } from '../constants/machine';

const MeasurementTool = lazy(() => import('./MeasurementToolBridge').then((m) => ({ default: m.MeasurementToolBridge })));
const AnnotationTool = lazy(() => import('./AnnotationToolBridge').then((m) => ({ default: m.AnnotationToolBridge })));

const VIEW_CUBE_CAMERA_CHANGE_EVENT = 'view-cube-camera-change';
const CAMERA_WRITE_INTERVAL = 0.2;
const CAMERA_POSITION_EPSILON = 0.12;
const CAMERA_TARGET_EPSILON = 0.08;
const MODEL_BASE_URL = `${import.meta.env.BASE_URL}models/`;
const URDF_BED_URL = `${MODEL_BASE_URL}urdf/surgical_bed_v2.urdf`;
const URDF_C_ARM_URL = `${MODEL_BASE_URL}urdf/c_arm.urdf`;

const BED_LINK_MATERIALS: LinkMaterialMap = {
  base_link: { color: 0xb5bcc6, roughness: 0.35, metalness: 0.45, envMapIntensity: 1.2 },
  bed_panel_mid: { color: 0x7a8088, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.8 },
  bed_panel_back: { color: 0x7a8088, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.8 },
  bed_head_board: { color: 0x7a8088, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.8 },
  bed_panel_left_leg: { color: 0x7a8088, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.8 },
  bed_panel_left_leg_lower: { color: 0x7a8088, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.8 },
  bed_panel_right_leg: { color: 0x7a8088, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.8 },
  bed_panel_right_leg_lower: { color: 0x7a8088, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.8 },
};

const ENCLOSURE_FACE_MATERIALS: Record<string, EnclosureFaceMaterials> = {
  bed_enclosure_1: {
    frontBack: { color: 0x525966, roughness: 0.40, metalness: 0.50, envMapIntensity: 1.0 },
    leftRight: { color: 0xd4a855, roughness: 0.25, metalness: 0.65, envMapIntensity: 1.2 },
    surround: { color: 0xc8d2dc, roughness: 0.38, metalness: 0.45, envMapIntensity: 1.0 },
  },
  bed_enclosure_2: {
    frontBack: { color: 0x525966, roughness: 0.40, metalness: 0.50, envMapIntensity: 1.0 },
    leftRight: { color: 0xd4a855, roughness: 0.25, metalness: 0.65, envMapIntensity: 1.2 },
    surround: { color: 0xc8d2dc, roughness: 0.38, metalness: 0.45, envMapIntensity: 1.0 },
  },
  bed_enclosure_3: {
    frontBack: { color: 0x525966, roughness: 0.40, metalness: 0.50, envMapIntensity: 1.0 },
    leftRight: { color: 0xd4a855, roughness: 0.25, metalness: 0.65, envMapIntensity: 1.2 },
    surround: { color: 0xc8d2dc, roughness: 0.38, metalness: 0.45, envMapIntensity: 1.0 },
  },
  bed_enclosure_4: {
    frontBack: { color: 0x525966, roughness: 0.40, metalness: 0.50, envMapIntensity: 1.0 },
    leftRight: { color: 0xd4a855, roughness: 0.25, metalness: 0.65, envMapIntensity: 1.2 },
    surround: { color: 0xc8d2dc, roughness: 0.38, metalness: 0.45, envMapIntensity: 1.0 },
  },
};

const CARM_LINK_MATERIALS: LinkMaterialMap = {
  c_arm_base: { color: 0xf0ece5, roughness: 0.55, metalness: 0.02, envMapIntensity: 0.6, clearcoat: 0.15, clearcoatRoughness: 0.4 },
  c_arm_column: { color: 0xf5f6f8, roughness: 0.08, metalness: 0.75, envMapIntensity: 3.0, clearcoat: 1.0, clearcoatRoughness: 0.05 },
  c_arm_head_lower: { color: 0xf0ece5, roughness: 0.50, metalness: 0.03, envMapIntensity: 0.65, clearcoat: 0.12, clearcoatRoughness: 0.45 },
  c_arm_head: { color: 0xf2eee7, roughness: 0.45, metalness: 0.04, envMapIntensity: 0.70, clearcoat: 0.10, clearcoatRoughness: 0.50 },
  c_arm_ring_arm: { color: 0xefebE4, roughness: 0.48, metalness: 0.03, envMapIntensity: 0.68, clearcoat: 0.12, clearcoatRoughness: 0.42 },
  c_arm_ring_no_arm: { color: 0xefebE4, roughness: 0.48, metalness: 0.03, envMapIntensity: 0.68, clearcoat: 0.12, clearcoatRoughness: 0.42 },
};

type OrbitLike = Pick<ElementRef<typeof OrbitControls>, 'target' | 'update'>;

const mapHeightJointToJ1 = (height: number) => {
  const t = (height - C_ARM_HEIGHT_MIN) / (C_ARM_HEIGHT_MAX - C_ARM_HEIGHT_MIN);
  return -Math.max(0, Math.min(1, t)) * 0.3;
};
const mmToWorld = (v: number) => v * MM_TO_WORLD;

const PART_TO_LINKS_MAP: Record<string, string[]> = {
  bed_height: ['bed_panel_mid', 'bed_panel_back', 'bed_head_board', 'bed_panel_left_leg', 'bed_panel_left_leg_lower', 'bed_panel_right_leg', 'bed_panel_right_leg_lower', 'bed_enclosure_1', 'bed_enclosure_2', 'bed_enclosure_3', 'bed_enclosure_4', 'bed_front_back_link', 'bed_tilt_link', 'bed_lateral_link'],
  bed_trendelenburg: ['bed_panel_mid', 'bed_panel_back', 'bed_head_board', 'bed_panel_left_leg', 'bed_panel_left_leg_lower', 'bed_panel_right_leg', 'bed_panel_right_leg_lower'],
  bed_lateral: ['bed_panel_mid', 'bed_panel_back', 'bed_head_board', 'bed_panel_left_leg', 'bed_panel_left_leg_lower', 'bed_panel_right_leg', 'bed_panel_right_leg_lower'],
  bed_frontBackPosition: ['bed_panel_mid', 'bed_panel_back', 'bed_head_board', 'bed_panel_left_leg', 'bed_panel_left_leg_lower', 'bed_panel_right_leg', 'bed_panel_right_leg_lower'],
  bed_backrestAngle: ['bed_panel_back', 'bed_head_board'],
  bed_headBoardAngle: ['bed_head_board'],
  bed_leftLegAngle: ['bed_panel_left_leg', 'bed_panel_left_leg_lower'],
  bed_leftLowerLegAngle: ['bed_panel_left_leg_lower'],
  bed_rightLegAngle: ['bed_panel_right_leg', 'bed_panel_right_leg_lower'],
  bed_rightLowerLegAngle: ['bed_panel_right_leg_lower'],
  carm_height: ['c_arm_column', 'c_arm_head_lower', 'c_arm_head', 'c_arm_ring_arm', 'c_arm_ring_no_arm'],
  carm_rotation: ['c_arm_ring_arm', 'c_arm_ring_no_arm'],
  carm_frontBackRotation: ['c_arm_ring_no_arm'],
  carm_frontBackTranslation: ['c_arm_head', 'c_arm_ring_arm', 'c_arm_ring_no_arm'],
};

const BED_VALUE_TO_PART_MAP: Record<string, string> = {
  height: 'bed_height',
  trendelenburg: 'bed_trendelenburg',
  lateral: 'bed_lateral',
  frontBackPosition: 'bed_frontBackPosition',
  backrestAngle: 'bed_backrestAngle',
  headBoardAngle: 'bed_headBoardAngle',
  leftLegAngle: 'bed_leftLegAngle',
  leftLowerLegAngle: 'bed_leftLowerLegAngle',
  rightLegAngle: 'bed_rightLegAngle',
  rightLowerLegAngle: 'bed_rightLowerLegAngle',
};

const CARM_VALUE_TO_PART_MAP: Record<string, string> = {
  cArmHeightJoint: 'carm_height',
  cArmRotation: 'carm_rotation',
  cArmFrontBackRotation: 'carm_frontBackRotation',
  frontBackTranslation: 'carm_frontBackTranslation',
};

const useHighlightFromInteraction = (
  interactingPart: string | null,
  interactionState: string
): string[] => {
  if (!interactingPart) return [];
  if (interactionState !== 'USER_INTERACTING') return [];
  return PART_TO_LINKS_MAP[interactingPart] || [];
};

const EMPTY_OBJ = {};

const HIGHLIGHT_DEBOUNCE_MS = 50;
const HIGHLIGHT_DISPLAY_MS = 800;
const HIGHLIGHT_MAX_DURATION_MS = 2500;
const HIGHLIGHT_CHANGE_THRESHOLD = 1;

const useBackendChangeHighlight = (
  bed: Record<string, number>,
  cArm: Record<string, number>,
  interactionState: string
): string[] => {
  const [highlightedLinks, setHighlightedLinks] = React.useState<string[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absoluteClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBedRef = useRef<Record<string, number>>({});
  const lastCArmRef = useRef<Record<string, number>>({});
  const pendingPartsRef = useRef<Set<string>>(new Set());
  const isHighlightingRef = useRef(false);
  const isMountedRef = useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const clearAllTimers = () => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
    if (absoluteClearTimerRef.current) { clearTimeout(absoluteClearTimerRef.current); absoluteClearTimerRef.current = null; }
  };

  const safeClearHighlight = React.useCallback(() => {
    if (isMountedRef.current) {
      setHighlightedLinks([]);
      isHighlightingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (interactionState !== 'IDLE') {
      clearAllTimers();
      safeClearHighlight();
      pendingPartsRef.current.clear();
      Object.assign(lastBedRef.current, bed);
      Object.assign(lastCArmRef.current, cArm);
      isHighlightingRef.current = false;
      return;
    }

    const changedParts = new Set<string>();

    const bedKeys = Object.keys(bed);
    for (let i = 0; i < bedKeys.length; i++) {
      const key = bedKeys[i];
      const val = bed[key];
      const prev = lastBedRef.current[key];
      if (prev !== undefined && Math.abs(val - prev) > HIGHLIGHT_CHANGE_THRESHOLD) {
        const part = BED_VALUE_TO_PART_MAP[key];
        if (part) changedParts.add(part);
      }
    }

    const cArmKeys = Object.keys(cArm);
    for (let i = 0; i < cArmKeys.length; i++) {
      const key = cArmKeys[i];
      const val = cArm[key];
      const prev = lastCArmRef.current[key];
      if (prev !== undefined && Math.abs(val - prev) > HIGHLIGHT_CHANGE_THRESHOLD) {
        const part = CARM_VALUE_TO_PART_MAP[key];
        if (part) changedParts.add(part);
      }
    }

    if (changedParts.size > 0) {
      isHighlightingRef.current = true;
      for (const part of changedParts) {
        pendingPartsRef.current.add(part);
      }

      if (!absoluteClearTimerRef.current) {
        absoluteClearTimerRef.current = setTimeout(() => {
          Object.assign(lastBedRef.current, bed);
          Object.assign(lastCArmRef.current, cArm);
          safeClearHighlight();
          absoluteClearTimerRef.current = null;
          if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
          if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
          pendingPartsRef.current.clear();
        }, HIGHLIGHT_MAX_DURATION_MS);
      }

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        const parts = pendingPartsRef.current;
        if (parts.size === 0) return;

        const links = new Set<string>();
        const partsArray = Array.from(parts);
        for (let i = 0; i < partsArray.length; i++) {
          const part = partsArray[i];
          const partLinks = PART_TO_LINKS_MAP[part] || [];
          for (let j = 0; j < partLinks.length; j++) {
            links.add(partLinks[j]);
          }
        }

        const nextLinks = Array.from(links);
        setHighlightedLinks(nextLinks);
        pendingPartsRef.current.clear();

        if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = setTimeout(() => {
          Object.assign(lastBedRef.current, bed);
          Object.assign(lastCArmRef.current, cArm);
          safeClearHighlight();
          maxDurationTimerRef.current = null;
          if (absoluteClearTimerRef.current) { clearTimeout(absoluteClearTimerRef.current); absoluteClearTimerRef.current = null; }
        }, HIGHLIGHT_DISPLAY_MS);
      }, HIGHLIGHT_DEBOUNCE_MS);
    } else if (!isHighlightingRef.current) {
      Object.assign(lastBedRef.current, bed);
      Object.assign(lastCArmRef.current, cArm);
    }

    return () => { };
  }, [bed, cArm, interactionState, safeClearHighlight]);

  return highlightedLinks;
};

const CameraController: React.FC<{ orbitRef: RefObject<OrbitLike | null> }> = ({ orbitRef }) => {
  const cameraPosition = useStore((s) => s.cameraPosition);
  const cameraTarget = useStore((s) => s.cameraTarget);
  const isResettingCamera = useStore((s) => s.isResettingCamera);
  const updateCameraPosition = useStore((s) => s.updateCameraPosition);
  const { camera } = useThree();
  const lastWriteTimer = useRef(0);
  const lastPos = useRef([0, 0, 0]);
  const lastTarget = useRef([0, 0, 0]);
  const suppressWriteRef = useRef(false);

  useEffect(() => {
    if (!isResettingCamera) return;
    suppressWriteRef.current = true;
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    if (orbitRef.current) {
      orbitRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
      orbitRef.current.update();
    }
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
    const posDelta = Math.abs(x - lastPos.current[0]) + Math.abs(y - lastPos.current[1]) + Math.abs(z - lastPos.current[2]);
    const targetDelta = Math.abs(tx - lastTarget.current[0]) + Math.abs(ty - lastTarget.current[1]) + Math.abs(tz - lastTarget.current[2]);
    if (posDelta < CAMERA_POSITION_EPSILON && targetDelta < CAMERA_TARGET_EPSILON) return;
    lastPos.current = [x, y, z];
    lastTarget.current = [tx, ty, tz];
    updateCameraPosition([x, y, z], [tx, ty, tz]);
  });

  return null;
};

const URDFBed: React.FC = () => {
  const bed = useStore((s) => s.bed);
  const bedInteractingPart = useStore((s) => s.bedInteractingPart);
  const bedInteractionState = useStore((s) => s.bedInteractionState);

  const interactionHighlight = useHighlightFromInteraction(bedInteractingPart, bedInteractionState);
  const bedValues = useMemo(() => ({
    height: bed.height ?? 0,
    trendelenburg: bed.trendelenburg ?? 0,
    lateral: bed.lateral ?? 0,
    frontBackPosition: bed.frontBackPosition ?? 0,
    backrestAngle: bed.backrestAngle ?? 0,
    headBoardAngle: bed.headBoardAngle ?? 0,
    leftLegAngle: bed.leftLegAngle ?? 0,
    leftLowerLegAngle: bed.leftLowerLegAngle ?? 0,
    rightLegAngle: bed.rightLegAngle ?? 0,
    rightLowerLegAngle: bed.rightLowerLegAngle ?? 0,
  }), [bed.height, bed.trendelenburg, bed.lateral, bed.frontBackPosition, bed.backrestAngle, bed.headBoardAngle, bed.leftLegAngle, bed.leftLowerLegAngle, bed.rightLegAngle, bed.rightLowerLegAngle]);

  const backendHighlight = useBackendChangeHighlight(bedValues, EMPTY_OBJ, bedInteractionState);
  const highlightedLinks = useMemo(() => {
    const combined = new Set([...interactionHighlight, ...backendHighlight]);
    return Array.from(combined);
  }, [interactionHighlight, backendHighlight]);

  const travelMaxMm = 390;
  const frontBackWorld = useMemo(() => mmToWorld(bed.frontBackPosition ?? 0), [bed.frontBackPosition]);
  const platformTiltDeg = Math.abs(bed.trendelenburg ?? 0) > 1e-6 ? (bed.trendelenburg ?? 0) : (bed.frontBackTilt ?? 0);
  const platformLateralDeg = Math.abs(bed.lateral ?? 0) > 1e-6 ? (bed.lateral ?? 0) : (bed.leftRightTilt ?? 0);
  const panelDownMm = useMemo(() => {
    const current = Math.max(500, Math.min(1000, bed.height || 500));
    return -((1000 - current) / (1000 - 500)) * travelMaxMm;
  }, [bed.height]);

  const enclosure3DownMm = useMemo(() => Math.max(-130, panelDownMm), [panelDownMm]);
  const enclosure2DownMm = useMemo(() => Math.max(-260, panelDownMm), [panelDownMm]);
  const enclosure1DownMm = useMemo(() => Math.max(-390, panelDownMm), [panelDownMm]);

  const joints = useMemo(() => ({
    bed_front_back_joint: (((bed.height || 500) - 500) / (1000 - 500) - 1) * mmToWorld(travelMaxMm),
    bed_height_joint: frontBackWorld,
    bed_panel_back_joint: (bed.backrestAngle || 0) * DEG,
    bed_head_board_joint: (bed.headBoardAngle || 0) * DEG,
    bed_panel_right_leg_joint: (bed.rightLegAngle || 0) * DEG,
    bed_panel_right_leg_lower_joint: (bed.rightLowerLegAngle || 0) * DEG,
    bed_panel_left_leg_joint: (bed.leftLegAngle || 0) * DEG,
    bed_panel_left_leg_lower_joint: (bed.leftLowerLegAngle || 0) * DEG,
  }), [bed.height, frontBackWorld, bed.backrestAngle, bed.headBoardAngle, bed.rightLegAngle, bed.rightLowerLegAngle, bed.leftLegAngle, bed.leftLowerLegAngle]);

  const linkOffsets = useMemo((): LinkOffsets => ({
    base_link: { pos: { x: mmToWorld(bed.baseOffset?.x ?? 0), y: mmToWorld(bed.baseOffset?.y ?? 0), z: mmToWorld(bed.baseOffset?.z ?? 0) }, rot: { x: bed.baseRotation?.x ?? 0, y: bed.baseRotation?.y ?? 0, z: bed.baseRotation?.z ?? 0 } },
    bed_surface: { pos: { x: mmToWorld(bed.surfaceOffset?.x ?? 0), y: mmToWorld(bed.surfaceOffset?.y ?? 0), z: mmToWorld(bed.surfaceOffset?.z ?? 0) }, rot: { x: bed.surfaceRotation?.x ?? 0, y: bed.surfaceRotation?.y ?? 0, z: bed.surfaceRotation?.z ?? 0 } },
    bed_panel_mid: { pos: { x: mmToWorld(bed.panelMidOffset?.x ?? 0), y: mmToWorld(bed.panelMidOffset?.y ?? 0), z: mmToWorld(bed.panelMidOffset?.z ?? 0) }, rot: { x: (bed.panelMidRotation?.x ?? 0) + platformTiltDeg, y: bed.panelMidRotation?.y ?? 0, z: (bed.panelMidRotation?.z ?? 0) + platformLateralDeg } },
    bed_panel_right_leg: { pos: { x: mmToWorld(bed.panelRightLegOffset?.x ?? 0), y: mmToWorld(bed.panelRightLegOffset?.y ?? 0), z: mmToWorld(bed.panelRightLegOffset?.z ?? 0) }, rot: { x: bed.panelRightLegRotation?.x ?? 0, y: bed.panelRightLegRotation?.y ?? 0, z: bed.panelRightLegRotation?.z ?? 0 } },
    bed_panel_left_leg: { pos: { x: mmToWorld(bed.panelLeftLegOffset?.x ?? 0), y: mmToWorld(bed.panelLeftLegOffset?.y ?? 0), z: mmToWorld(bed.panelLeftLegOffset?.z ?? 0) }, rot: { x: bed.panelLeftLegRotation?.x ?? 0, y: bed.panelLeftLegRotation?.y ?? 0, z: bed.panelLeftLegRotation?.z ?? 0 } },
    bed_panel_back: { pos: { x: mmToWorld(bed.panelBackOffset?.x ?? 0), y: mmToWorld(bed.panelBackOffset?.y ?? 0), z: mmToWorld(bed.panelBackOffset?.z ?? 0) }, rot: { x: bed.panelBackRotation?.x ?? 0, y: bed.panelBackRotation?.y ?? 0, z: bed.panelBackRotation?.z ?? 0 } },
    bed_enclosure_1: { pos: { x: 0, y: mmToWorld(enclosure1DownMm), z: 0 }, rot: { x: 0, y: 0, z: 0 } },
    bed_enclosure_2: { pos: { x: 0, y: mmToWorld(enclosure2DownMm), z: 0 }, rot: { x: 0, y: 0, z: 0 } },
    bed_enclosure_3: { pos: { x: 0, y: mmToWorld(enclosure3DownMm), z: 0 }, rot: { x: 0, y: 0, z: 0 } },
  }), [bed, frontBackWorld, panelDownMm, platformTiltDeg, platformLateralDeg, enclosure1DownMm, enclosure2DownMm, enclosure3DownMm]);

  return <URDFModel urdfUrl={URDF_BED_URL} position={[1.2 + mmToWorld(bed.x || 0), mmToWorld(bed.y || 0), mmToWorld(bed.z || 0)]} rotation={[(bed.rotX || 0) * DEG, (+90 + (bed.rotY || 0)) * DEG, 0]} jointValues={joints} linkOffsets={linkOffsets} highlightedLinks={highlightedLinks} linkMaterials={BED_LINK_MATERIALS} enclosureFaceMaterials={ENCLOSURE_FACE_MATERIALS} lerpFactor={0.15} />;
};

const URDFCArm: React.FC = () => {
  const cArm = useStore((s) => s.cArm);
  const cArmInteractingPart = useStore((s) => s.cArmInteractingPart);
  const cArmInteractionState = useStore((s) => s.cArmInteractionState);

  const interactionHighlight = useHighlightFromInteraction(cArmInteractingPart, cArmInteractionState);
  const cArmValues = useMemo(() => ({
    cArmHeightJoint: cArm.cArmHeightJoint ?? 0,
    cArmRotation: cArm.cArmRotation ?? 0,
    cArmFrontBackRotation: cArm.cArmFrontBackRotation ?? 0,
    frontBackTranslation: cArm.frontBackTranslation ?? 0,
  }), [cArm.cArmHeightJoint, cArm.cArmRotation, cArm.cArmFrontBackRotation, cArm.frontBackTranslation]);

  const backendHighlight = useBackendChangeHighlight(EMPTY_OBJ, cArmValues, cArmInteractionState);
  const highlightedLinks = useMemo(() => {
    const combined = new Set([...interactionHighlight, ...backendHighlight]);
    return Array.from(combined);
  }, [interactionHighlight, backendHighlight]);

  const frontBackWorld = mmToWorld(cArm.frontBackTranslation ?? 0);
  const joints = useMemo(() => ({
    arm_height_joint: mapHeightJointToJ1(cArm.cArmHeightJoint ?? C_ARM_HEIGHT_MIN),
    arm_tilt_joint: (cArm.cArmRotation || 0) * DEG,
    c_ring_rotation_joint: (cArm.cArmFrontBackRotation || 0) * DEG,
  }), [cArm.cArmHeightJoint, cArm.cArmRotation, cArm.cArmFrontBackRotation]);

  const linkOffsets = useMemo((): LinkOffsets => ({
    c_arm_base: { pos: { x: mmToWorld(cArm.baseOffset?.x ?? 0), y: mmToWorld(cArm.baseOffset?.y ?? 0), z: mmToWorld(cArm.baseOffset?.z ?? 0) }, rot: { x: cArm.baseRotation?.x ?? 0, y: cArm.baseRotation?.y ?? 0, z: cArm.baseRotation?.z ?? 0 } },
    c_arm_column: { pos: { x: mmToWorld(cArm.columnOffset?.x ?? 0), y: mmToWorld(cArm.columnOffset?.y ?? 0), z: mmToWorld(cArm.columnOffset?.z ?? 0) }, rot: { x: cArm.columnRotation?.x ?? 0, y: cArm.columnRotation?.y ?? 0, z: cArm.columnRotation?.z ?? 0 } },
    c_arm_head_lower: { pos: { x: mmToWorld(cArm.headLowerOffset?.x ?? 0), y: mmToWorld(cArm.headLowerOffset?.y ?? 0), z: mmToWorld(cArm.headLowerOffset?.z ?? 0) }, rot: { x: cArm.headLowerRotation?.x ?? 0, y: cArm.headLowerRotation?.y ?? 0, z: cArm.headLowerRotation?.z ?? 0 } },
    c_arm_head: { pos: { x: mmToWorld(cArm.headOffset?.x ?? 0), y: mmToWorld(cArm.headOffset?.y ?? 0) + frontBackWorld, z: mmToWorld(cArm.headOffset?.z ?? 0) }, rot: { x: cArm.headRotation?.x ?? 0, y: cArm.headRotation?.y ?? 0, z: cArm.headRotation?.z ?? 0 } },
    c_arm_ring_arm: { pos: { x: mmToWorld(cArm.ringArmOffset?.x ?? 0) - 0.02, y: mmToWorld(cArm.ringArmOffset?.y ?? 0), z: mmToWorld(cArm.ringArmOffset?.z ?? 0) }, rot: { x: cArm.ringArmRotation?.x ?? 0, y: cArm.ringArmRotation?.y ?? 0, z: cArm.ringArmRotation?.z ?? 0 } },
    c_arm_ring_no_arm: { pos: { x: mmToWorld(cArm.ringNoArmOffset?.x ?? 0), y: mmToWorld(cArm.ringNoArmOffset?.y ?? 0), z: mmToWorld(cArm.ringNoArmOffset?.z ?? 0) }, rot: { x: cArm.ringNoArmRotation?.x ?? 0, y: cArm.ringNoArmRotation?.y ?? 0, z: cArm.ringNoArmRotation?.z ?? 0 } },
  }), [cArm, frontBackWorld]);

  return <URDFModel urdfUrl={URDF_C_ARM_URL} position={[-1 + mmToWorld(cArm.x || 0), mmToWorld(cArm.y || 0), mmToWorld(cArm.z || 0)]} rotation={[0, 90 * DEG, 0]} jointValues={joints} linkOffsets={linkOffsets} highlightedLinks={highlightedLinks} linkMaterials={CARM_LINK_MATERIALS} lerpFactor={0.2} />;
};

export const OperatingRoomScene: React.FC = () => {
  const orbitRef = useRef<ElementRef<typeof OrbitControls> | null>(null);
  const { invalidate, gl, camera } = useThree();
  const isMeasuring = useStore((s) => s.isMeasuring);
  const isAnnotating = useStore((s) => s.isAnnotating);
  const sceneLocked = useStore((s) => s.sceneLocked);
  const showBedModelInScene = useStore((s) => s.showBedModelInScene);
  const showCArmModelInScene = useStore((s) => s.showCArmModelInScene);
  const setSceneInteracting = useStore((s) => s.setSceneInteracting);
  const lockOrbit = isMeasuring || isAnnotating || sceneLocked;

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
      window.dispatchEvent(new CustomEvent(VIEW_CUBE_CAMERA_CHANGE_EVENT, {
        detail: {
          position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
          target: [target?.x ?? 0, target?.y ?? 0, target?.z ?? 0] as [number, number, number],
        },
      }));
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
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enableRotate={!lockOrbit}
        enablePan={!lockOrbit}
        enableZoom={!lockOrbit}
        minDistance={0.6}
        maxDistance={18}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0.6, 0]}
        regress
        onStart={() => setSceneInteracting(true)}
        onEnd={() => setSceneInteracting(false)}
        onChange={() => {
          invalidate();
          emitViewCubeCameraChange();
        }}
      />

      <GizmoHelper alignment="bottom-left" margin={[500, 780]}>
        <GizmoViewport rotation={[0, 90 * DEG, 0]} axisColors={['#ff4d4f', '#52c41a', '#1677ff']} labelColor="white" />
      </GizmoHelper>
    </>
  );
};

export default OperatingRoomScene;
