import { SpacePose } from './index';

export interface BedStatusPoseItem {
  name: string;
  image?: string;
  state: {
    bed_height_joint: number;
    bed_tilt_joint: number;
    bed_lateral_joint: number;
    bed_front_back_joint: number;
    bed_panel_back_joint: number;
    bed_panel_left_leg_joint: number;
    bed_panel_right_leg_joint: number;
  };
  isDynamic?: boolean;
}

export interface BedStatusListResponse {
  version: string;
  status: Record<string, BedStatusPoseItem>;
  error?: string;
}

export type DemoListResponse = BedStatusListResponse;

export interface JointMoveResult {
  ok: boolean;
  error: string;
}

export interface CArmModeResponse {
  mode: 1 | -1 | 0;
}

export interface SpaceDevice {
  id: string;
  name: string;
  urdfPath: string;
  basePose: SpacePose;
  jointPositions: Record<string, number>;
  links: Record<string, {
    position: [number, number, number];
    rpy: [number, number, number];
  }>;
}

export interface SpaceResponse {
  version: string;
  space: Record<string, SpaceDevice>;
}

export interface DevicePositionResponse {
  version: string;
  pos: {
    basePose: SpacePose;
    jointPositions: Record<string, number>;
    links: Record<string, {
      position: [number, number, number];
      rpy: [number, number, number];
    }>;
  };
}

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
  errorKind?: 'timeout' | 'network' | 'http';
  httpStatus?: number;
}

export interface DeviceErrorInfo {
  device: string;
  error: string;
}

export interface FullSpaceDataResult {
  version: string;
  globalError: string;
  deviceErrors: DeviceErrorInfo[];
  devices: Record<string, DevicePositionResponse['pos']>;
}

export interface GetPosErrorsResult {
  globalError: string;
  deviceErrors: DeviceErrorInfo[];
}

export interface DeviceState {
  device: 'surgical_bed' | 'c_arm';
  timestamp: number;
  state: {
    bed?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      joints: {
        bed_height_joint: number;
        bed_tilt_joint: number;
        bed_lateral_joint: number;
        bed_panel_back_joint: number;
        bed_panel_right_leg_joint: number;
        bed_panel_left_leg_joint: number;
        bed_front_back_joint?: number;
      };
    };
    cArm?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      joints: {
        arm_height_joint: number;
        arm_tilt_joint: number;
        c_ring_rotation_joint: number;
        arm_front_back_joint?: number;
        front_back_translation_joint?: number;
      };
    };
  };
}

export interface DeviceConfig {
  device: string;
  urdf_url: string;
  joints: Array<{
    name: string;
    type: 'prismatic' | 'revolute' | 'fixed';
    axis: 'x' | 'y' | 'z';
    limits: { lower: number; upper: number };
    unit: 'meters' | 'radians';
  }>;
  meshes: Array<{
    name: string;
    file: string;
    scale: number;
  }>;
}
