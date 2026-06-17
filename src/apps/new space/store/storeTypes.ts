/**
 * @file storeTypes.ts
 * @description Store 接口定义
 * @author IOBS Team
 * @date 2024-01-01
 */

import type { BedStatusPoseItem } from '../services/presetApi';
import type {
  NewSpaceInteractionState,
  NewSpaceSceneBedState,
  NewSpaceSceneCArmState,
  NewSpaceToastType,
  NewSpaceToastItem,
  BackendConnectionStatus,
  LastUpdateSource,
  IncomingBackendDeviceState,
} from '../types/store';
import type { SpaceDeviceInfo } from '../types/space';

export interface NewSpaceStore {
  toasts: NewSpaceToastItem[];
  selectedTelemetryModuleId: string | null;
  cArmRotation: number;
  cArmFrontBackRotation: number;
  cArmHeightJoint: number;
  frontBackTranslation: number;
  bedInteractionState: NewSpaceInteractionState;
  bedInteractingPart: string | null;
  cArmInteractionState: NewSpaceInteractionState;
  cArmInteractingPart: string | null;
  lastUpdateSource: LastUpdateSource;
  backendConnectionStatus: BackendConnectionStatus;
  backendLatency: number;
  backendGlobalError: string;
  backendDeviceErrors: Array<{ device: string; error: string }>;
  backendServerError: string;
  lastBackendTimestamp: number;
  spaceDevices: SpaceDeviceInfo[];
  selectedBedDeviceId: string | null;
  selectedCArmDeviceId: string | null;
  bed: NewSpaceSceneBedState;
  cArm: NewSpaceSceneCArmState;
  bedRawJoints: Record<string, number>;
  cArmRawJoints: Record<string, number>;
  bedStateName: string;
  bedStateProgress: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  isResettingCamera: boolean;
  showBedModelInScene: boolean;
  showCArmModelInScene: boolean;
  isMeasuring: boolean;
  isAnnotating: boolean;
  isSceneInteracting: boolean;
  sceneLocked: boolean;
  setSceneLocked: (locked: boolean) => void;
  cArmModeState: 1 | -1 | 0;
  cArmModeLoading: boolean;
  cArmLoadingJoint: string | null;
  presetLoading: boolean;
  presetApplyingId: string | null;
  presetLastAppliedId: string | null;
  presetIsTwoColumn: boolean;
  presetSource: 'current' | 'demo';
  presetQuery: string;
  presetItems: Array<{ id: string; item: BedStatusPoseItem }>;
  presetKeyOrder: string[];
  presetBrokenImageIds: Record<string, boolean>;
  bedJointSpeeds: Record<string, number>;
  setBedJointSpeed: (joint: string, speed: number) => void;
  setBedAngle: (key: string, value: number) => void;
  pushToast: (message: string, type?: NewSpaceToastType) => void;
  removeToast: (id: string) => void;
  setSelectedTelemetryModuleId: (id: string | null) => void;
  requireSelectedTelemetryModule: () => string | null;
  sendBedTelemetryModuleMove: (direction: 'up' | 'down' | 'left' | 'right') => Promise<void>;
  sendBedJointMoveWithSpeed: (joint: string, speed: number) => Promise<void>;
  setCArmRotation: (value: number) => void;
  setCArmFrontBackRotation: (value: number) => void;
  setCArmHeightJoint: (value: number) => void;
  setCArmFrontBackTranslation: (value: number) => void;
  setBedInteractionState: (value: NewSpaceStore['bedInteractionState']) => void;
  setBedInteractingPart: (value: string | null) => void;
  setCArmInteractionState: (value: NewSpaceStore['cArmInteractionState']) => void;
  setCArmInteractingPart: (value: string | null) => void;
  resetLocalCArmPose: () => void;
  hydrateCArmMode: () => Promise<void>;
  applyCArmMode: (mode: 1 | -1 | 0) => Promise<void>;
  sendCArmJointMove: (joint: string, speed: number) => Promise<void>;
  setPresetIsTwoColumn: (value: boolean | ((prev: boolean) => boolean)) => void;
  setPresetSource: (value: 'current' | 'demo') => void;
  setPresetQuery: (value: string) => void;
  setPresetLoading: (value: boolean) => void;
  setPresetApplyingId: (value: string | null) => void;
  setPresetLastAppliedId: (value: string | null) => void;
  setPresetItems: (value: Array<{ id: string; item: BedStatusPoseItem }>) => void;
  setPresetKeyOrder: (value: string[] | ((prev: string[]) => string[])) => void;
  setPresetBrokenImageIds: (value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  loadPresetStatusList: (source?: 'current' | 'demo') => Promise<void>;
  applyPresetById: (id: string) => Promise<void>;
  updateCameraPosition: (position: [number, number, number], target: [number, number, number]) => void;
  setSceneInteracting: (interacting: boolean) => void;
  setShowBedModelInScene: (visible: boolean) => void;
  setShowCArmModelInScene: (visible: boolean) => void;
  toggleMeasuring: () => void;
  toggleAnnotating: () => void;
  loadSpaceDevices: () => Promise<void>;
  setSelectedBedDeviceId: (deviceId: string | null) => void;
  setSelectedCArmDeviceId: (deviceId: string | null) => void;
  applyBackendDeviceState: (incoming: IncomingBackendDeviceState) => boolean;
  refreshDevicePositionsFromBackend: () => Promise<void>;
  loadBedPositionFromBackend: (deviceId?: string | null) => Promise<void>;
  setLastBackendTimestamp: (timestamp: number) => void;
  syncToBackend: () => Promise<void>;
  initializeBackendSync: () => void;
  cleanupBackendSync: () => void;
  loadFromBackend: (options?: { silent?: boolean }) => Promise<void>;
  emergencyStopping: boolean;
  sendEmergencyStop: () => Promise<void>;
}
