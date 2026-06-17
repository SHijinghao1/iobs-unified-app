/**
 * @file mappers.ts
 * @description 后端数据到前端状态的映射器
 * @author IOBS Team
 * @date 2024-01-01
 */

import {
  BED_HEIGHT_MIN,
  BED_HEIGHT_MAX,
  clampBedBackrestAngle,
  clampBedFrontBackPosition,
  clampBedLateral,
  clampBedLegAngle,
  clampBedHeadBoardAngle,
  clampBedLowerLegAngle,
  clampBedTrendelenburg,
  clampCArmFrontBackTranslation,
  clampCArmHeightJoint,
  clampHeight,
} from '../constants/machine';
import type { NewSpaceSceneBedState, NewSpaceSceneCArmState } from '../store';

export interface BackendBedState {
  bed_height_joint?: number;
  bed_tilt_joint?: number;
  bed_lateral_joint?: number;
  bed_front_back_joint?: number;
  bed_panel_back_joint?: number;
  bed_panel_left_leg_joint?: number;
  bed_panel_right_leg_joint?: number;
  bed_head_board_joint?: number;
  bed_panel_left_leg_lower_joint?: number;
  bed_panel_right_leg_lower_joint?: number;
  bed_panel_left_right_lower_joint?: number;
  bed_panel_left_right_joint?: number;
  tilt?: number;
  bed_tilt?: number;
  tilt_joint?: number;
  lateral?: number;
  bed_lateral?: number;
  lateral_joint?: number;
  backrestAngle?: number;
  leftLegAngle?: number;
  rightLegAngle?: number;
  headBoardAngle?: number;
  leftLowerLegAngle?: number;
  rightLowerLegAngle?: number;
  frontBackPosition?: number;
  bed_height?: number;
  height?: number;
  height_joint?: number;
  z?: number;
  bed_front_back?: number;
}

export interface BackendCArmState {
  arm_height_joint?: number;
  arm_tilt_joint?: number;
  c_ring_rotation_joint?: number;
  arm_front_back_translation?: number;
  arm_rotation?: number;
  tilt_joint?: number;
  ring_rotation?: number;
  rotation_joint?: number;
  arm_front_back_joint?: number;
  arm_joint2?: number;
  joint2?: number;
  joint_2?: number;
  arm_translation_joint?: number;
  front_back_translation_joint?: number;
  column_to_head_lower_joint?: number;
  arm_translation?: number;
  arm_front_back?: number;
  front_back?: number;
  translation?: number;
  fb?: number;
  height_joint?: number;
  arm_height?: number;
  z?: number;
}

const VALUE_CHANGE_THRESHOLD = 0.1;
const BED_JOINT_MAPPING_MODE = (import.meta.env.VITE_BED_JOINT_MAPPING_MODE === 'legacy' ? 'legacy' : 'spec') as 'legacy' | 'spec';

export const hasSignificantChange = (newValue: number | undefined, oldValue: number | undefined): boolean => {
  if (newValue === undefined) return false;
  if (oldValue === undefined) return true;
  return Math.abs(newValue - oldValue) >= VALUE_CHANGE_THRESHOLD;
};

export const applyThresholdFilter = (newValue: number | undefined, oldValue: number | undefined): number | undefined => {
  return hasSignificantChange(newValue, oldValue) ? newValue : oldValue;
};

const looksLikeWorldUnits = (value: number) => Math.abs(value) <= 10;
const worldToMm = (value: number) => value * 1000;
const normalizeBackendLinear = (value: number) => (looksLikeWorldUnits(value) ? worldToMm(value) : value);
const normalizeBackendJointLinear = (value: number) => (looksLikeWorldUnits(value) ? worldToMm(value) : value);
const denormalizeLinearForBackend = (value: number) => value;

const pickBedHeightJointValue = (joints: Partial<Record<string, number>>, fallback: number) => {
  if (BED_JOINT_MAPPING_MODE === 'legacy') {
    return joints.bed_front_back_joint ?? joints.bed_front_back ?? joints.bed_height_joint ?? joints.bed_height ?? joints.height ?? joints.height_joint ?? joints.z ?? fallback;
  }
  return joints.bed_height_joint ?? joints.bed_height ?? joints.height ?? joints.height_joint ?? joints.bed_front_back_joint ?? joints.bed_front_back ?? joints.z ?? fallback;
};

const pickBedFrontBackJointValue = (joints: Partial<Record<string, number>>, fallback: number) => {
  if (BED_JOINT_MAPPING_MODE === 'legacy') {
    return joints.bed_height_joint ?? joints.bed_height ?? joints.frontBackPosition ?? joints.bed_front_back_joint ?? joints.bed_front_back ?? fallback;
  }
  return joints.bed_front_back_joint ?? joints.bed_front_back ?? joints.frontBackPosition ?? joints.bed_height_joint ?? joints.bed_height ?? fallback;
};

const fromBackendBedHeight = (heightJointRaw: number) => {
  if (heightJointRaw >= BED_HEIGHT_MIN && heightJointRaw <= BED_HEIGHT_MAX) return heightJointRaw;
  return clampHeight(heightJointRaw);
};

export const toBackendBedHeightStroke = (heightAbsMm: number) => clampHeight(heightAbsMm) - BED_HEIGHT_MIN;
export const toBackendLinear = (value: number) => denormalizeLinearForBackend(value);

export const mapBackendBedToScene = (
  backend: Partial<BackendBedState>,
  currentScene?: Partial<NewSpaceSceneBedState>
): Partial<NewSpaceSceneBedState> => {
  const current = currentScene ?? {};
  const joints = backend as Partial<Record<string, number>>;
  const scene: Partial<NewSpaceSceneBedState> = {};

  const rawHeightValue = pickBedHeightJointValue(joints, current.height ?? BED_HEIGHT_MIN);
  const rawFrontBackValue = pickBedFrontBackJointValue(joints, current.frontBackPosition ?? 0);

  const height = applyThresholdFilter(
    fromBackendBedHeight(rawHeightValue),
    current.height
  );
  if (height !== undefined) scene.height = height;

  const trendelenburg = applyThresholdFilter(
    clampBedTrendelenburg(joints.tilt ?? joints.bed_tilt_joint ?? joints.bed_tilt ?? joints.tilt_joint ?? current.trendelenburg ?? 0),
    current.trendelenburg
  );
  if (trendelenburg !== undefined) scene.trendelenburg = trendelenburg;

  const lateral = applyThresholdFilter(
    clampBedLateral(joints.lateral ?? joints.bed_lateral_joint ?? joints.bed_lateral ?? joints.lateral_joint ?? current.lateral ?? 0),
    current.lateral
  );
  if (lateral !== undefined) scene.lateral = lateral;

  const backrestAngle = applyThresholdFilter(
    clampBedBackrestAngle(joints.backrestAngle ?? joints.bed_panel_back_joint ?? current.backrestAngle ?? 0),
    current.backrestAngle
  );
  if (backrestAngle !== undefined) scene.backrestAngle = backrestAngle;

  const leftLegAngle = applyThresholdFilter(
    clampBedLegAngle(joints.leftLegAngle ?? joints.bed_panel_left_leg_joint ?? current.leftLegAngle ?? 0),
    current.leftLegAngle
  );
  if (leftLegAngle !== undefined) scene.leftLegAngle = leftLegAngle;

  const rightLegAngle = applyThresholdFilter(
    clampBedLegAngle(joints.rightLegAngle ?? joints.bed_panel_right_leg_joint ?? joints.bed_panel_left_right_joint ?? current.rightLegAngle ?? 0),
    current.rightLegAngle
  );
  if (rightLegAngle !== undefined) scene.rightLegAngle = rightLegAngle;

  const headBoardAngle = applyThresholdFilter(
    clampBedHeadBoardAngle(joints.headBoardAngle ?? joints.bed_head_board_joint ?? current.headBoardAngle ?? 0),
    current.headBoardAngle
  );
  if (headBoardAngle !== undefined) scene.headBoardAngle = headBoardAngle;

  const leftLowerLegAngle = applyThresholdFilter(
    clampBedLowerLegAngle(joints.leftLowerLegAngle ?? joints.bed_panel_left_leg_lower_joint ?? current.leftLowerLegAngle ?? 0),
    current.leftLowerLegAngle
  );
  if (leftLowerLegAngle !== undefined) scene.leftLowerLegAngle = leftLowerLegAngle;

  const rightLowerLegAngle = applyThresholdFilter(
    clampBedLowerLegAngle(joints.rightLowerLegAngle ?? joints.bed_panel_right_leg_lower_joint ?? joints.bed_panel_left_right_lower_joint ?? current.rightLowerLegAngle ?? 0),
    current.rightLowerLegAngle
  );
  if (rightLowerLegAngle !== undefined) scene.rightLowerLegAngle = rightLowerLegAngle;

  const frontBackPosition = applyThresholdFilter(
    clampBedFrontBackPosition(rawFrontBackValue),
    current.frontBackPosition
  );
  if (frontBackPosition !== undefined) scene.frontBackPosition = frontBackPosition;

  return scene;
};

export const mapSceneBedToBackend = (scene: Partial<NewSpaceSceneBedState>): Partial<BackendBedState> => {
  const backend: Partial<BackendBedState> = {};
  if (scene.height !== undefined) backend.bed_height_joint = toBackendBedHeightStroke(scene.height);
  if (scene.trendelenburg !== undefined) backend.bed_tilt_joint = scene.trendelenburg;
  if (scene.lateral !== undefined) backend.bed_lateral_joint = scene.lateral;
  if (scene.frontBackPosition !== undefined) backend.bed_front_back_joint = toBackendLinear(scene.frontBackPosition);
  if (scene.backrestAngle !== undefined) backend.bed_panel_back_joint = scene.backrestAngle;
  if (scene.headBoardAngle !== undefined) backend.bed_head_board_joint = scene.headBoardAngle;
  if (scene.leftLegAngle !== undefined) backend.bed_panel_left_leg_joint = scene.leftLegAngle;
  if (scene.leftLowerLegAngle !== undefined) backend.bed_panel_left_leg_lower_joint = scene.leftLowerLegAngle;
  if (scene.rightLegAngle !== undefined) backend.bed_panel_right_leg_joint = scene.rightLegAngle;
  if (scene.rightLowerLegAngle !== undefined) backend.bed_panel_right_leg_lower_joint = scene.rightLowerLegAngle;
  return backend;
};

export const mapBackendCArmToScene = (
  backend: Partial<BackendCArmState>,
  currentScene?: Partial<NewSpaceSceneCArmState>
): Partial<NewSpaceSceneCArmState> => {
  const current = currentScene ?? {};
  const scene: Partial<NewSpaceSceneCArmState> = {};

  const cArmHeightJoint = applyThresholdFilter(
    clampCArmHeightJoint(backend.arm_height_joint ?? backend.height_joint ?? backend.arm_height ?? backend.z ?? current.cArmHeightJoint ?? 350),
    current.cArmHeightJoint
  );
  if (cArmHeightJoint !== undefined) scene.cArmHeightJoint = cArmHeightJoint;

  const cArmRotation = applyThresholdFilter(
    backend.arm_tilt_joint ?? backend.arm_rotation ?? backend.tilt_joint ?? current.cArmRotation ?? 0,
    current.cArmRotation
  );
  if (cArmRotation !== undefined) scene.cArmRotation = cArmRotation;

  const cArmFrontBackRotation = applyThresholdFilter(
    backend.c_ring_rotation_joint ?? backend.ring_rotation ?? backend.rotation_joint ?? current.cArmFrontBackRotation ?? 0,
    current.cArmFrontBackRotation
  );
  if (cArmFrontBackRotation !== undefined) scene.cArmFrontBackRotation = cArmFrontBackRotation;

  const frontBackTranslation = applyThresholdFilter(
    clampCArmFrontBackTranslation(
      backend.arm_front_back_joint ??
      backend.arm_joint2 ??
      backend.joint2 ??
      backend.joint_2 ??
      backend.arm_translation_joint ??
      backend.front_back_translation_joint ??
      backend.column_to_head_lower_joint ??
      backend.arm_translation ??
      backend.arm_front_back_translation ??
      backend.arm_front_back ??
      backend.front_back ??
      backend.translation ??
      backend.fb ??
      current.frontBackTranslation ?? 150
    ),
    current.frontBackTranslation
  );
  if (frontBackTranslation !== undefined) scene.frontBackTranslation = frontBackTranslation;

  return scene;
};

export const mapSceneCArmToBackend = (scene: Partial<NewSpaceSceneCArmState>): Partial<BackendCArmState> => {
  const backend: Partial<BackendCArmState> = {};
  if (scene.cArmHeightJoint !== undefined) backend.arm_height_joint = toBackendLinear(scene.cArmHeightJoint);
  if (scene.cArmRotation !== undefined) backend.arm_tilt_joint = scene.cArmRotation;
  if (scene.cArmFrontBackRotation !== undefined) backend.c_ring_rotation_joint = scene.cArmFrontBackRotation;
  if (scene.frontBackTranslation !== undefined) backend.arm_front_back_joint = toBackendLinear(scene.frontBackTranslation);
  return backend;
};
