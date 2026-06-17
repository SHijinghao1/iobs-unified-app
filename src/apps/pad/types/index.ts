// 类型定义：作为全项目共享的数据结构基准，并与 `store.ts` 保持一致。

export type InteractionState = 'IDLE' | 'USER_INTERACTING' | 'AWAITING_BACKEND_UPDATE';

export type InteractingPart = 
  | 'bed_height' 
  | 'bed_trendelenburg' 
  | 'bed_lateral' 
  | 'bed_frontBackPosition' 
  | 'bed_backrestAngle' 
  | 'bed_leftLegAngle' 
  | 'bed_rightLegAngle'
  | 'carm_height'
  | 'carm_rotation'
  | 'carm_frontBackRotation'
  | 'carm_frontBackTranslation'
  | null;

export type BackendConnectionStatus = 'connected' | 'degraded' | 'disconnected';

export interface XYZ { x: number; y: number; z: number; }

export interface SpacePose {
  position: [number, number, number];
  rpy: [number, number, number];
}

export interface LinkOffset {
  pos: XYZ;  // 平移偏移（毫米）
  rot: XYZ;  // 旋转偏移（角度）
  lerpFactor?: number;
}

export interface BedState {
  x: number;
  y: number;
  z: number;
  height: number;
  tilt: number;        // 绕 Z 轴旋转（度）
  rotX: number;        // 绕 X 轴旋转（度）
  rotY: number;        // 绕 Y 轴旋转（度）
  trendelenburg: number; // 角度
  lateral: number;     // 角度
  // 手动控制字段
  frontBackPosition: number; // 毫米
  backrestAngle: number;     // 角度
  leftLegAngle: number;      // 角度
  rightLegAngle: number;     // 角度
  leftRightTilt: number;     // 角度
  vAngle: number;            // 角度
  frontBackTilt: number;     // 角度
  // 拆分后的链接微调偏移
  // 第 1 部分：底座
  baseOffset:    XYZ;
  baseRotation:  XYZ;
  // 第 2 部分：床面（在 URDF 关节运动基础上继续微调）
  surfaceOffset:   XYZ;
  surfaceRotation: XYZ;
  // 第 3 部分：床中间面板
  panelMidOffset:    XYZ;
  panelMidRotation:  XYZ;
  // 第 4 部分：床面右腿板
  panelRightLegOffset:    XYZ;
  panelRightLegRotation:  XYZ;
  // 第 5 部分：床面左腿板
  panelLeftLegOffset:    XYZ;
  panelLeftLegRotation:  XYZ;
  // 第 6 部分：床面背板
  panelBackOffset:    XYZ;
  panelBackRotation:  XYZ;
  // 围挡（1~3 跟随床高，4 固定）
  enclosure1Offset: XYZ;
  enclosure2Offset: XYZ;
  enclosure3Offset: XYZ;
}

export interface CArmState {
  rao: number;   // 绕 Y 轴角度
  caud: number;  // 绕 X 轴角度
  rotZ: number;  // 绕 Z 轴角度
  ap: number;    // 角度
  x: number;
  y: number;
  z: number;
  frontBackTranslation: number;
  // C 臂各链接的微调偏移（共 5 段）
  // 第 1 部分：c_arm_base
  baseOffset:  XYZ;
  baseRotation: XYZ;
  // 第 1.5 部分：c_arm_column（升降筒立柱）
  columnOffset:  XYZ;
  columnRotation: XYZ;
  // 第 2 部分：c_arm_head
  headOffset:  XYZ;
  headRotation: XYZ;
  headLowerOffset?: XYZ;
  headLowerRotation?: XYZ;
  // 第 3 部分：c_arm_ring_no_arm
  ringNoArmOffset:  XYZ;
  ringNoArmRotation: XYZ;
  // 第 4 部分：c_arm_ring_arm
  ringArmOffset:  XYZ;
  ringArmRotation: XYZ;
  mode: 'fluoroscopy' | 'low-dose' | 'angio';
  // 关节驱动值
  cArmRotation: number;          // c_ring_rotation_joint（角度）
  cArmFrontBackRotation: number; // c_ring_frontback_joint（角度）
  cArmHeightJoint: number;       // arm_height_joint（毫米，-500 ~ +500）
  // 兼容旧字段（内部会映射到 ringNoArmOffset / ringArmOffset）
  cArmRingOffset:      XYZ;
  cArmRingArmOffset:   XYZ;
  cArmRingNoArmOffset: XYZ;
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  timestamp: number;
}

export interface ToastEntry {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: number;
}

export interface CameraView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface SpaceDeviceInfo {
  id: string;
  name: string;
  urdfPath: string;
  basePose: {
    position: [number, number, number];
    rpy: [number, number, number];
  };
  jointPositions: Record<string, number>;
  links: Record<string, {
    position: [number, number, number];
    rpy: [number, number, number];
  }>;
}

export interface Preset {
  id: string;
  name: string;
  bed: BedState;
  cArm: CArmState;
}

export interface DistanceMeasurement {
  id: string;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  distance: number;
}

export interface AreaMeasurement {
  id: string;
  points: [number, number, number][];
  area: number;
}

export interface AngleMeasurement {
  id: string;
  points: [[number, number, number], [number, number, number], [number, number, number]];
  angle: number;
}

export interface Annotation {
  id: string;
  position: [number, number, number];
  text: string;
  color: string;
}

export interface BackendDeviceError {
  device: string;
  error: string;
}

export interface EquipmentState {
  bed: BedState;
  cArm: CArmState;
  agv: {
    status: 'idle' | 'moving' | 'charging';
    battery: number;
    location: { x: number; y: number };
  };
  environment: {
    temperature: number;
    humidity: number;
    lighting: {
      intensity: number;
      colorTemp: number;
      status: boolean;
    };
    ventilation: {
      speed: 'low' | 'medium' | 'high';
      laminarFlow: boolean;
    };
  };
  surgery: {
    stage: 'PREP' | 'ACCESS' | 'EMBOLIZATION' | 'CLOSURE';
    elapsedTime: number;
    dose: number;
  };
  connection: {
    bed: boolean;
    cArm: boolean;
    agv: boolean;
    light: boolean;
  };
  lastUpdateSource: 'ui' | 'backend';
  lastBackendTimestamp: number;
  logs: LogEntry[];
  spaceDevices: SpaceDeviceInfo[];
  selectedBedDeviceId: string | null;
  /** 多台 C 臂时，指定哪一条后端设备驱动当前场景中的 C 臂模型 */
  selectedCArmDeviceId: string | null;
  showBedModelInScene: boolean;
  showCArmModelInScene: boolean;
  cameraViews: CameraView[];
  currentViewIndex: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  defaultCameraPosition: [number, number, number];
  defaultCameraTarget: [number, number, number];
  isResettingCamera: boolean;
  isCameraAnimationComplete: boolean;
  isSceneInteracting: boolean;
  presets: Preset[];
  collisionWarning: boolean;
  toasts: ToastEntry[];
  measurements: DistanceMeasurement[];
  areaMeasurements: AreaMeasurement[];
  angleMeasurements: AngleMeasurement[];
  isMeasuring: boolean;
  measurementMode: 'distance' | 'area' | 'angle';
  measurementPoints: [number, number, number][];
  annotations: Annotation[];
  isAnnotating: boolean;
  selectedAnnotationColor: string;
  showPresetPanel: boolean;
  activeTab: 'bed' | 'carm' | 'agv' | 'env' | 'scene' | 'settings';
  interactionState: InteractionState;
  interactingPart: InteractingPart;
  backendConnectionStatus: BackendConnectionStatus;
  backendLatency: number;
  backendGlobalError: string;
  backendDeviceErrors: BackendDeviceError[];
  backendServerError: string;
  modelLoadProgress: { bed: number; cArm: number };
}

export interface Actions {
  setBedPosition: (keyOrPartial: keyof BedState | Partial<BedState>, value?: number) => void;
  setBedSurfaceOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedBaseOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedSurfaceRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedBaseRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedPanelMidOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedPanelMidRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedPanelRightLegOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedPanelRightLegRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedPanelLeftLegOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedPanelLeftLegRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedPanelBackOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setBedPanelBackRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmPosition: (key: keyof CArmState, value: number | string) => void;
  setCArmRotation: (rotation: number) => void;
  setCArmFrontBackRotation: (rotation: number) => void;
  setCArmHeightJoint: (value: number) => void;
  setCArmFrontBackTranslation: (value: number) => void;
  setCArmBaseOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmBaseRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmColumnOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmColumnRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmHeadOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmHeadRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmRingNoArmOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmRingNoArmRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmRingArmOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setCArmRingArmRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
  // Legacy aliases
  setCArmRingOffset: (axis: 'x' | 'y' | 'z', value: number) => void;
  setEnvironment: (key: string, value: unknown) => void;
  setSurgeryStage: (stage: EquipmentState['surgery']['stage']) => void;
  addLog: (message: string, type: LogEntry['type']) => void;
  toggleConnection: (device: keyof EquipmentState['connection']) => void;
  resetPositions: () => void;
  resetCameraView: () => void;
  setCameraView: (position: [number, number, number], target: [number, number, number]) => void;
  setDefaultCameraView: (position: [number, number, number], target: [number, number, number]) => void;
  applyStandardPreset: () => void;
  updateCameraPosition: (position: [number, number, number], target: [number, number, number]) => void;
  markCameraAnimationComplete: () => void;
  setSceneInteracting: (interacting: boolean) => void;
  setInteractionState: (state: InteractionState) => void;
  setInteractingPart: (part: InteractingPart) => void;
  setBackendConnectionStatus: (status: BackendConnectionStatus) => void;
  clearStorage: () => void;
  applyPreset: (presetId: string) => void;
  setSpaceDevices: (devices: SpaceDeviceInfo[]) => void;
  setSelectedBedDeviceId: (deviceId: string | null) => void;
  setSelectedCArmDeviceId: (deviceId: string | null) => void;
  setShowBedModelInScene: (visible: boolean) => void;
  setShowCArmModelInScene: (visible: boolean) => void;
  loadSpaceDevices: () => Promise<void>;
  loadBedPositionFromBackend: (deviceId?: string) => Promise<void>;
  /** 一次刷新当前选中的手术床 + C 臂的 get_pos */
  refreshDevicePositionsFromBackend: () => Promise<void>;
  saveCameraView: (name: string, position: [number, number, number], target: [number, number, number]) => void;
  updateCameraView: (index: number, updates: Partial<Pick<CameraView, 'name' | 'position' | 'target'>>) => void;
  moveCameraView: (fromIndex: number, toIndex: number) => void;
  setCurrentViewIndex: (index: number) => void;
  syncCurrentViewIndex: (position: [number, number, number], target: [number, number, number]) => void;
  loadCameraView: (index: number) => void;
  deleteCameraView: (index: number) => void;
  exportConfig: () => void;
  importConfig: (config: unknown) => void;
  initializeBackendSync: () => void;
  cleanupBackendSync: () => void;
  syncToBackend: () => Promise<void>;
  loadFromBackend: (options?: { silent?: boolean }) => Promise<void>;
  applyBackendDeviceState: (state: {
    device: 'surgical_bed' | 'c_arm';
    timestamp: number;
    state: {
      bed?: {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number };
        joints: {
          /**
           * 床高拉杆行程（mm）：0~170。
           * 约定：0 = 最低位（1030mm），170 = 最高位（1200mm）。
           */
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
  }) => boolean;
  setLastUpdateSource: (source: EquipmentState['lastUpdateSource']) => void;
  setLastBackendTimestamp: (timestamp: number) => void;
  addToast: (message: string, type: ToastEntry['type']) => void;
  removeToast: (id: string) => void;
  toggleMeasuring: () => void;
  setMeasurementMode: (mode: EquipmentState['measurementMode']) => void;
  addMeasurement: (startPoint: [number, number, number], endPoint: [number, number, number]) => void;
  addAreaMeasurement: (points: [number, number, number][]) => void;
  addAngleMeasurement: (points: [[number, number, number], [number, number, number], [number, number, number]]) => void;
  removeMeasurement: (id: string) => void;
  removeAreaMeasurement: (id: string) => void;
  removeAngleMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  toggleAnnotating: () => void;
  addAnnotation: (position: [number, number, number], text: string, color: string) => void;
  updateAnnotation: (id: string, text: string, color: string) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  exportAnnotations: () => void;
  importAnnotations: (annotations: Annotation[]) => void;
  setSelectedAnnotationColor: (color: string) => void;
  togglePresetPanel: () => void;
  setActiveTab: (tab: EquipmentState['activeTab']) => void;
  resetBedParts: () => void;
  resetCArmParts: () => void;
  setModelLoadProgress: (model: 'bed' | 'cArm', progress: number) => void;
}
