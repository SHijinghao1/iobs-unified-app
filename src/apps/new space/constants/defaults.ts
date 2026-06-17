/**
 * @file defaults.ts
 * @description 手术室应用默认值配置
 * @author IOBS Team
 * @date 2024-01-01
 */

import type { NewSpaceSceneBedState, NewSpaceSceneCArmState, NewSpaceXYZ } from '../types/store';

const zeroXYZ = (): NewSpaceXYZ => ({ x: 0, y: 0, z: 0 });

export const DEFAULT_NEW_SPACE_CAMERA_POSITION: [number, number, number] = [4, 1, -4];
export const DEFAULT_NEW_SPACE_CAMERA_TARGET: [number, number, number] = [0, 0.6, 0];

export const DEFAULT_NEW_SPACE_BED: NewSpaceSceneBedState = {
  x: 0, y: 0, z: 0, rotX: 0, rotY: 0,
  height: 750, trendelenburg: 0, lateral: 0, frontBackPosition: 0,
  backrestAngle: 0, headBoardAngle: 0, leftLegAngle: 0, leftLowerLegAngle: 0, rightLegAngle: 0, rightLowerLegAngle: 0,
  leftRightTilt: 0, frontBackTilt: 0,
  baseOffset: zeroXYZ(), baseRotation: zeroXYZ(), surfaceOffset: zeroXYZ(), surfaceRotation: zeroXYZ(),
  panelMidOffset: zeroXYZ(), panelMidRotation: zeroXYZ(), panelRightLegOffset: zeroXYZ(), panelRightLegRotation: zeroXYZ(),
  panelLeftLegOffset: zeroXYZ(), panelLeftLegRotation: zeroXYZ(), panelBackOffset: zeroXYZ(), panelBackRotation: zeroXYZ(),
  enclosure1Offset: zeroXYZ(), enclosure2Offset: zeroXYZ(), enclosure3Offset: zeroXYZ(),
};

export const DEFAULT_NEW_SPACE_CARM: NewSpaceSceneCArmState = {
  x: 0, y: 0, z: 0, frontBackTranslation: 150, cArmRotation: 0, cArmFrontBackRotation: 0, cArmHeightJoint: 350,
  baseOffset: zeroXYZ(), baseRotation: zeroXYZ(), columnOffset: zeroXYZ(), columnRotation: zeroXYZ(),
  headOffset: zeroXYZ(), headRotation: zeroXYZ(), headLowerOffset: zeroXYZ(), headLowerRotation: zeroXYZ(),
  ringNoArmOffset: zeroXYZ(), ringNoArmRotation: zeroXYZ(), ringArmOffset: zeroXYZ(), ringArmRotation: zeroXYZ(),
};

export const DEFAULT_BED_JOINT_SPEEDS: Record<string, number> = {
  bed_height_joint: 400,
  bed_tilt_joint: 400,
  bed_lateral_joint: 400,
  bed_front_back_joint: 2500,
  bed_panel_back_joint: 10000,
  bed_head_board_joint: 10000,
  bed_panel_left_leg_joint: 400,
  bed_panel_left_leg_lower_joint: 400,
  bed_panel_right_leg_joint: 400,
  bed_panel_right_leg_lower_joint: 400,
};
