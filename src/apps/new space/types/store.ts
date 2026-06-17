/**
 * @file store.ts
 * @description 状态管理类型定义
 * @author IOBS Team
 * @date 2024-01-01
 */

export type NewSpaceXYZ = { x: number; y: number; z: number };
export type NewSpaceInteractionState = 'IDLE' | 'USER_INTERACTING' | 'AWAITING_BACKEND_UPDATE';

export interface NewSpaceSceneBedState {
  x: number; y: number; z: number;
  rotX: number; rotY: number;
  height: number; trendelenburg: number; lateral: number; frontBackPosition: number;
  backrestAngle: number; leftLegAngle: number; rightLegAngle: number;
  headBoardAngle: number; leftLowerLegAngle: number; rightLowerLegAngle: number;
  leftRightTilt: number; frontBackTilt: number;
  baseOffset: NewSpaceXYZ; baseRotation: NewSpaceXYZ; surfaceOffset: NewSpaceXYZ; surfaceRotation: NewSpaceXYZ;
  panelMidOffset: NewSpaceXYZ; panelMidRotation: NewSpaceXYZ; panelRightLegOffset: NewSpaceXYZ; panelRightLegRotation: NewSpaceXYZ;
  panelLeftLegOffset: NewSpaceXYZ; panelLeftLegRotation: NewSpaceXYZ; panelBackOffset: NewSpaceXYZ; panelBackRotation: NewSpaceXYZ;
  enclosure1Offset: NewSpaceXYZ; enclosure2Offset: NewSpaceXYZ; enclosure3Offset: NewSpaceXYZ;
}

export interface NewSpaceSceneCArmState {
  x: number; y: number; z: number;
  frontBackTranslation: number;
  cArmRotation: number; cArmFrontBackRotation: number; cArmHeightJoint: number;
  baseOffset: NewSpaceXYZ; baseRotation: NewSpaceXYZ; columnOffset: NewSpaceXYZ; columnRotation: NewSpaceXYZ;
  headOffset: NewSpaceXYZ; headRotation: NewSpaceXYZ; headLowerOffset: NewSpaceXYZ; headLowerRotation: NewSpaceXYZ;
  ringNoArmOffset: NewSpaceXYZ; ringNoArmRotation: NewSpaceXYZ; ringArmOffset: NewSpaceXYZ; ringArmRotation: NewSpaceXYZ;
}

export type NewSpaceToastType = 'error' | 'warning' | 'info' | 'success';

export interface NewSpaceToastItem {
  id: string;
  message: string;
  type: NewSpaceToastType;
}

export type BackendConnectionStatus = 'disconnected' | 'connected' | 'degraded';
export type LastUpdateSource = 'ui' | 'backend';

export interface IncomingBackendDeviceState {
  device: 'surgical_bed' | 'c_arm';
  timestamp: number;
  state: {
    bed?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      joints: Record<string, number>;
    };
    cArm?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      joints: Record<string, number>;
    };
  };
}
