import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  fetchSpaceDevices,
  fetchDevicePosition,
  fetchFullSpaceData,
  type DevicePositionResponse,
} from './store/services/api';
import type {
  EquipmentState, Actions, BedState, CArmState,
  Annotation, LogEntry, ToastEntry, XYZ,
  InteractionState, BackendConnectionStatus, InteractingPart,
} from './types';
import {
  isLikelyBedDevice,
  isLikelyCArmDevice,
  listCArmDeviceCandidates,
  resolveCArmBinding,
} from './utils/spaceDeviceBindings';
import {
  WORLD_TO_MM,
  BED_HEIGHT_MIN,
  BED_HEIGHT_MAX,
  BED_HEIGHT_STROKE_MAX,
  clampHeight,
  clampBedTrendelenburg,
  clampBedLateral,
  clampBedBackrestAngle,
  clampBedLegAngle,
  clampBedFrontBackPosition,
  clampCArmRotation,
  clampCArmFrontBackRotation,
  clampCArmHeightJoint,
  clampCArmFrontBackTranslation,
  clampPosition,
  clampOffset,
} from './constants/machine';

// 全局状态中心：统一维护设备状态、场景工具和后端同步逻辑。

const BACKEND_STATE_LOG_COOLDOWN_MS = 3000;

let _backendReachable: boolean | null = null;
let _backendPollingTimer: ReturnType<typeof setInterval> | null = null;
let _consecutiveErrors = 0;
let _lastErrorLogged = false;
const MAX_CONSECUTIVE_ERRORS = 5;
const ERROR_RECOVERY_TIME = 5000;

const markBackendReachability = (
  reachable: boolean,
  addLog: (message: string, type: 'info' | 'warning' | 'success') => void
) => {
  if (_backendReachable === reachable) return;
  _backendReachable = reachable;

  if (reachable) {
    _consecutiveErrors = 0;
    addLog('后端连接已恢复', 'success');
  } else {
    addLog('后端未启动或不可达，已暂停实时同步提示刷屏', 'warning');
  }
};

const stopBackendPolling = () => {
  if (_backendPollingTimer !== null) {
    clearInterval(_backendPollingTimer);
    _backendPollingTimer = null;
  }
};

const startBackendPolling = (loadFromBackend: () => Promise<void>, addToast?: (m: string, t: 'error' | 'warning' | 'info' | 'success') => void, interval = 100) => {
  stopBackendPolling();
  let inFlight = false;
  let isCoolingDown = false;

  _backendPollingTimer = setInterval(() => {
    // 增加页面可见性检查：如果页面不可见，则暂停轮询以节省资源
    if (document.visibilityState === 'hidden') return;
    
    if (inFlight || isCoolingDown) return;
    
    inFlight = true;
    void loadFromBackend()
      .then(() => {
        _consecutiveErrors = 0;
        _lastErrorLogged = false;
      })
      .catch((err) => {
        _consecutiveErrors++;
        if (!_lastErrorLogged) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[Backend Polling Error #${_consecutiveErrors}] ${errMsg}`);
          _lastErrorLogged = true;
        }
        
        if (_consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          isCoolingDown = true;
          console.warn(`[Circuit Breaker] Too many consecutive errors, cooling down for ${ERROR_RECOVERY_TIME}ms`);
          if (addToast) {
            addToast('后端连接不稳定，已启动熔断保护。请检查后端程序是否运行正常。', 'error');
          }
          setTimeout(() => {
            isCoolingDown = false;
            _consecutiveErrors = 0;
            _lastErrorLogged = false;
          }, ERROR_RECOVERY_TIME);
        }
      })
      .finally(() => {
        inFlight = false;
      });
  }, interval);
};

// ─── 零点坐标辅助 ─────────────────────────────────────────────────────────────
const ZERO: XYZ = { x: 0, y: 0, z: 0 };
const zeroXYZ = (): XYZ => ({ ...ZERO });

// ─── 默认状态 ───────────────────────────────────────────────────────────────

const DEFAULT_BED: BedState = {
  x: 0, y: 0, z: 0,
  height: 1200,
  tilt: 0, rotX: 0, rotY: 0,
  trendelenburg: 0, lateral: 0,
  frontBackPosition: 0,
  backrestAngle: 0,
  leftLegAngle: 0,
  rightLegAngle: 0,
  leftRightTilt: 0,
  vAngle: 0,
  frontBackTilt: 0,
  // Part 1: base_link
  baseOffset:    zeroXYZ(),
  baseRotation:  zeroXYZ(),
  // Part 2: bed_surface
  surfaceOffset:   zeroXYZ(),
  surfaceRotation: zeroXYZ(),
  // Part 3: bed_panel_mid
  panelMidOffset:    zeroXYZ(),
  panelMidRotation:  zeroXYZ(),
  // Part 4: bed_panel_right_leg
  panelRightLegOffset:    zeroXYZ(),
  panelRightLegRotation:  zeroXYZ(),
  // Part 5: bed_panel_left_leg
  panelLeftLegOffset:    zeroXYZ(),
  panelLeftLegRotation:  zeroXYZ(),
  // Part 6: bed_panel_back
  panelBackOffset:    zeroXYZ(),
  panelBackRotation:  zeroXYZ(),
  // Enclosure offsets (for bed height adjustment)
  enclosure1Offset:   zeroXYZ(),
  enclosure2Offset:   zeroXYZ(),
  enclosure3Offset:   zeroXYZ(),
  // enclosure4 不动
};

const DEFAULT_CARM: CArmState = {
  rao: 0, caud: 0, rotZ: 0, ap: 0,
  x: 0, y: 0, z: 0,
  frontBackTranslation: 150,
  // Part 1: c_arm_base
  baseOffset:  zeroXYZ(),
  baseRotation: zeroXYZ(),
  // Part 1.5: c_arm_column（升降筒立柱）
  columnOffset:  zeroXYZ(),
  columnRotation: zeroXYZ(),
  // Part 2: c_arm_head
  headOffset:  zeroXYZ(),
  headRotation: zeroXYZ(),
  // Part 3: c_arm_ring_no_arm
  ringNoArmOffset:  zeroXYZ(),
  ringNoArmRotation: zeroXYZ(),
  // Part 4: c_arm_ring_arm
  ringArmOffset:  zeroXYZ(),
  ringArmRotation: zeroXYZ(),
  mode: 'fluoroscopy',
  cArmRotation: 0,
  cArmFrontBackRotation: 0,
  cArmHeightJoint: 350,
  // Legacy alias fields
  cArmRingOffset:      zeroXYZ(),
  cArmRingArmOffset:   zeroXYZ(),
  cArmRingNoArmOffset: zeroXYZ(),
};

const DEFAULT_PRESETS = [
  { id: 'standard', name: '标准手术位', bed: { ...DEFAULT_BED }, cArm: { ...DEFAULT_CARM } },
  { id: 'lateral',  name: '侧位',       bed: { ...DEFAULT_BED }, cArm: { ...DEFAULT_CARM, cArmRotation: -90 } },
  { id: 'ap',       name: '前后位',     bed: { ...DEFAULT_BED }, cArm: { ...DEFAULT_CARM, cArmFrontBackRotation: -20 } },
];

const DEFAULT_CAMERA_POSITION: [number, number, number] = [4, 1, -4];
const DEFAULT_CAMERA_TARGET:   [number, number, number] = [0, 0.6, 0];

// 碰撞检测暂时关闭（返回 false）
const checkCollision = (_bed: BedState, _cArm: CArmState): boolean => {
  void _bed;
  void _cArm;
  return false;
};

const worldToMm = (value: number) => value * WORLD_TO_MM;
const looksLikeWorldUnits = (value: number) => Math.abs(value) <= 100;
const normalizeBackendLinear = (value: number) => (looksLikeWorldUnits(value) ? worldToMm(value) : value);
const normalizeBackendJointLinear = (value: number) => value;

const BED_JOINT_MAPPING_MODE = (import.meta.env.VITE_BED_JOINT_MAPPING_MODE === 'legacy' ? 'legacy' : 'spec') as 'legacy' | 'spec';

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

/**
 * 协议约定：bed_height_joint 使用“行程值”0~170mm（相对最低位 1030mm）
 * 兼容：若后端仍返回绝对高度（1030~1200），也可自动识别。
 */
const fromBackendBedHeight = (heightJointRaw: number) => {
  const v = normalizeBackendLinear(heightJointRaw); 
  // 如果数值在 1030-1200 之间，说明是绝对高度（毫米）
  if (v >= BED_HEIGHT_MIN && v <= BED_HEIGHT_MAX) {
    return v;
  }
  // 如果数值很小 (0~170)，说明是拉杆行程（毫米）
  if (v >= 0 && v <= BED_HEIGHT_STROKE_MAX) {
    return clampHeight(BED_HEIGHT_MIN + v);
  }
  // 否则尝试自动换算（如果是米单位，已经在 normalizeBackendLinear 转过了）
  // 此时若仍不在范围内，尝试按行程累加
  if (v > 0 && v < BED_HEIGHT_MIN) {
     return clampHeight(BED_HEIGHT_MIN + v);
  }
  return clampHeight(v);
};

// ─── Tiny ID helper ────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Surgery timer ───────────────────────────────────────────────────────────
let _timerHandle: ReturnType<typeof setInterval> | null = null;
let _syncDebounceHandle: ReturnType<typeof setTimeout> | null = null;
let _lastBackendLoadLogAt = 0;

let _lastUserCommandAt = 0;
const IGNORE_BACKEND_AFTER_COMMAND_MS = 800;

const startSurgeryTimer = (set: (fn: (s: { surgery: EquipmentState['surgery'] }) => Partial<EquipmentState>) => void) => {
  if (_timerHandle !== null) return;
  _timerHandle = setInterval(() => {
    set((state) => ({ surgery: { ...state.surgery, elapsedTime: state.surgery.elapsedTime + 1 } }));
  }, 1000);
};

export const useStore = create<EquipmentState & Actions>()(
  persist(
    (set, get) => {
      startSurgeryTimer(set as Parameters<typeof startSurgeryTimer>[0]);

      const _applyDeviceState = (deviceId: string, pos: DevicePositionResponse['pos']) => {
        const currentInteraction = get().interactionState;
        
        // 增加竞态保护：如果用户刚刚发送过指令，或者正在交互，则忽略后端位姿同步
        const now = Date.now();
        if (
          currentInteraction === 'USER_INTERACTING' || 
          (now - _lastUserCommandAt < IGNORE_BACKEND_AFTER_COMMAND_MS)
        ) {
          return;
        }

        // 如果是等待更新状态，则在接收到第一次数据后自动切回 IDLE
        if (currentInteraction === 'AWAITING_BACKEND_UPDATE') {
          set({ interactionState: 'IDLE', interactingPart: null });
        }

        const device = get().spaceDevices.find(d => d.id === deviceId);
        if (!device) return;

        if (isLikelyBedDevice(device)) {
          const [x, y, z] = pos.basePose.position;
          const [rotX, rotY, tilt] = pos.basePose.rpy;
          const joints = pos.jointPositions;
          set(state => ({
            bed: {
              ...state.bed,
              x: normalizeBackendLinear(x),
              y: normalizeBackendLinear(y),
              z: normalizeBackendLinear(z),
              rotX,
              rotY,
              tilt,
              height: fromBackendBedHeight(pickBedHeightJointValue(joints, state.bed.height)),
              trendelenburg: clampBedTrendelenburg(
                joints.tilt ?? 
                joints.bed_tilt_joint ?? 
                joints.bed_tilt ?? 
                joints.tilt_joint ?? 
                state.bed.trendelenburg
              ),
              lateral: clampBedLateral(
                joints.lateral ?? 
                joints.bed_lateral_joint ?? 
                joints.bed_lateral ?? 
                joints.lateral_joint ?? 
                state.bed.lateral
              ),
              backrestAngle: clampBedBackrestAngle(
                joints.backrestAngle ?? 
                joints.bed_panel_back_joint ?? 
                joints.bed_backrest ?? 
                state.bed.backrestAngle
              ),
              leftLegAngle: clampBedLegAngle(
                joints.leftLegAngle ?? 
                joints.bed_panel_left_leg_joint ?? 
                state.bed.leftLegAngle
              ),
              rightLegAngle: clampBedLegAngle(
                joints.rightLegAngle ?? 
                joints.bed_panel_right_leg_joint ?? 
                state.bed.rightLegAngle
              ),
              frontBackPosition: clampBedFrontBackPosition(
                normalizeBackendJointLinear(
                  pickBedFrontBackJointValue(joints, state.bed.frontBackPosition)
                )
              ),
            },
            lastUpdateSource: 'backend',
          }));
        } else if (isLikelyCArmDevice(device)) {
          const [cx, cy, cz] = pos.basePose.position;
          const [caud, rao, rotZ] = pos.basePose.rpy;
          const cj = pos.jointPositions;
          set(state => ({
            cArm: {
              ...state.cArm,
              x: normalizeBackendLinear(cx),
              y: normalizeBackendLinear(cy),
              z: normalizeBackendLinear(cz),
              caud,
              rao,
              rotZ,
              cArmHeightJoint: normalizeBackendLinear(
                cj.arm_height_joint ?? 
                cj.height_joint ?? 
                cj.arm_height ?? 
                cj.z ?? 
                state.cArm.cArmHeightJoint
              ),
              cArmRotation: cj.arm_tilt_joint ?? cj.arm_rotation ?? cj.tilt_joint ?? state.cArm.cArmRotation,
              cArmFrontBackRotation: cj.c_ring_rotation_joint ?? cj.ring_rotation ?? cj.rotation_joint ?? state.cArm.cArmFrontBackRotation,
              frontBackTranslation: clampCArmFrontBackTranslation(
                normalizeBackendLinear(
                  cj.arm_front_back_joint ?? 
                  cj.arm_joint2 ??
                  cj.joint2 ??
                  cj.joint_2 ??
                  cj.arm_translation_joint ??
                  cj.front_back_translation_joint ?? 
                  cj.column_to_head_lower_joint ?? 
                  cj.arm_translation ?? 
                  cj.arm_front_back ?? 
                  cj.front_back ?? 
                  cj.translation ?? 
                  cj.fb ?? 
                  cj.joint_2 ??
                  cj.arm_fb_joint ??
                  state.cArm.frontBackTranslation
                )
              ),
            },
            lastUpdateSource: 'backend',
          }));
        }
      };

      return ({
      // ── Initial state ──────────────────────────────────────────────────
      bed:  { ...DEFAULT_BED },
      cArm: { ...DEFAULT_CARM },
      agv: { status: 'idle', battery: 85, location: { x: 0, y: 0 } },
      environment: {
        temperature: 22,
        humidity: 45,
        lighting:    { intensity: 80, colorTemp: 5000, status: true },
        ventilation: { speed: 'medium', laminarFlow: true },
      },
      surgery:    { stage: 'ACCESS', elapsedTime: 5075, dose: 48 },
      connection: { bed: true, cArm: true, agv: true, light: true },
      lastUpdateSource: 'ui',
      lastBackendTimestamp: 0,
      logs: [
        { id: '1', message: '系统启动自检完成', type: 'success', timestamp: Date.now() - 5000 },
        { id: '2', message: 'C臂接近机械限位',  type: 'warning', timestamp: Date.now() - 2000 },
      ],
      spaceDevices:            [],
      selectedBedDeviceId:     null,
      selectedCArmDeviceId:    null,
      showBedModelInScene:     true,
      showCArmModelInScene:    true,
      toasts: [],
      cameraViews:               [],
      currentViewIndex:          -1,
      cameraPosition:            DEFAULT_CAMERA_POSITION,
      cameraTarget:              DEFAULT_CAMERA_TARGET,
      defaultCameraPosition:     DEFAULT_CAMERA_POSITION,
      defaultCameraTarget:       DEFAULT_CAMERA_TARGET,
      isResettingCamera:         false,
      isCameraAnimationComplete: false,
      isSceneInteracting:        false,
      presets:          DEFAULT_PRESETS,
      collisionWarning: false,
      measurements:     [],
      areaMeasurements:  [],
      angleMeasurements: [],
      isMeasuring:       false,
      measurementMode:   'distance',
      measurementPoints: [],
      annotations:      [],
      isAnnotating:     false,
      selectedAnnotationColor: '#FF0000',
      showPresetPanel:  false,
      interactionState: 'IDLE' as InteractionState,
      interactingPart: null as InteractingPart,
      backendConnectionStatus: 'disconnected' as BackendConnectionStatus,
      backendLatency: 0,
      activeTab: 'bed' as EquipmentState['activeTab'],
      backendGlobalError: '',
      backendDeviceErrors: [],
      backendServerError: '',
      modelLoadProgress: { bed: 0, cArm: 0 },

      // ── Bed actions ────────────────────────────────────────────────────
      setBedPosition: (keyOrPartial, value) => {
        set((state) => {
          let patch: Partial<BedState>;
          if (typeof keyOrPartial === 'object') {
            patch = keyOrPartial;
          } else {
            let clamped = value as number;
            if (keyOrPartial === 'height') clamped = clampHeight(clamped);
            else if (keyOrPartial === 'trendelenburg') clamped = clampBedTrendelenburg(clamped);
            else if (keyOrPartial === 'lateral') clamped = clampBedLateral(clamped);
            else if (keyOrPartial === 'backrestAngle') clamped = clampBedBackrestAngle(clamped);
            else if (keyOrPartial === 'leftLegAngle' || keyOrPartial === 'rightLegAngle') clamped = clampBedLegAngle(clamped);
            else if (keyOrPartial === 'frontBackPosition') clamped = clampBedFrontBackPosition(clamped);
            else if (keyOrPartial === 'x' || keyOrPartial === 'y' || keyOrPartial === 'z') clamped = clampPosition(clamped);
            patch = { [keyOrPartial]: clamped };
          }

          // 床高驱动围挡联动：
          // enclosure_4 固定不动；enclosure_1/2/3 仅向下伸缩，且分别在触底后停止。
          const nextHeight = patch.height ?? state.bed.height;
          const heightMin = 1030;
          const heightMax = 1200;
          const downTravelMax = 420; // mm
          const ratio = (heightMax - nextHeight) / (heightMax - heightMin);
          const downTravel = Math.max(0, Math.min(1, ratio)) * downTravelMax;

          const enclosure3Y = -downTravel;
          const enclosure2Y = -downTravel;
          const enclosure1Y = -downTravel;

          const newBed = {
            ...state.bed,
            ...patch,
            enclosure1Offset: { ...state.bed.enclosure1Offset, y: enclosure1Y },
            enclosure2Offset: { ...state.bed.enclosure2Offset, y: enclosure2Y },
            enclosure3Offset: { ...state.bed.enclosure3Offset, y: enclosure3Y },
          };

          const hasCollision = checkCollision(newBed, state.cArm);
          if (hasCollision && !state.collisionWarning) {
            Promise.resolve().then(() => get().addLog('警告：设备可能发生碰撞', 'warning'));
          }
          return { bed: newBed, collisionWarning: hasCollision };
        });
      },

      // bed part 1: base_link
      setBedBaseOffset: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, baseOffset: { ...state.bed.baseOffset, [axis]: clampOffset(value) } } }));
      },
      setBedBaseRotation: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, baseRotation: { ...state.bed.baseRotation, [axis]: value } } }));
      },

      // bed part 2: bed_surface
      setBedSurfaceOffset: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, surfaceOffset: { ...state.bed.surfaceOffset, [axis]: clampOffset(value) } } }));
      },
      setBedSurfaceRotation: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, surfaceRotation: { ...state.bed.surfaceRotation, [axis]: value } } }));
      },

      // bed part 3: bed_panel_mid
      setBedPanelMidOffset: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, panelMidOffset: { ...state.bed.panelMidOffset, [axis]: clampOffset(value) } } }));
      },
      setBedPanelMidRotation: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, panelMidRotation: { ...state.bed.panelMidRotation, [axis]: value } } }));
      },

      // bed part 4: bed_panel_right_leg
      setBedPanelRightLegOffset: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, panelRightLegOffset: { ...state.bed.panelRightLegOffset, [axis]: clampOffset(value) } } }));
      },
      setBedPanelRightLegRotation: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, panelRightLegRotation: { ...state.bed.panelRightLegRotation, [axis]: value } } }));
      },

      // bed part 5: bed_panel_left_leg
      setBedPanelLeftLegOffset: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, panelLeftLegOffset: { ...state.bed.panelLeftLegOffset, [axis]: clampOffset(value) } } }));
      },
      setBedPanelLeftLegRotation: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, panelLeftLegRotation: { ...state.bed.panelLeftLegRotation, [axis]: value } } }));
      },

      // bed part 6: bed_panel_back
      setBedPanelBackOffset: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, panelBackOffset: { ...state.bed.panelBackOffset, [axis]: clampOffset(value) } } }));
      },
      setBedPanelBackRotation: (axis, value) => {
        set((state) => ({ bed: { ...state.bed, panelBackRotation: { ...state.bed.panelBackRotation, [axis]: value } } }));
      },

      // Enclosure setters (for bed height adjustment with layered constraints)
      setEnclosure1Offset: (axis: 'x' | 'y' | 'z', value: number) => {
        set((state) => ({ bed: { ...state.bed, enclosure1Offset: { ...state.bed.enclosure1Offset, [axis]: clampOffset(value) } } }));
      },
      setEnclosure2Offset: (axis: 'x' | 'y' | 'z', value: number) => {
        set((state) => ({ bed: { ...state.bed, enclosure2Offset: { ...state.bed.enclosure2Offset, [axis]: clampOffset(value) } } }));
      },
      setEnclosure3Offset: (axis: 'x' | 'y' | 'z', value: number) => {
        set((state) => ({ bed: { ...state.bed, enclosure3Offset: { ...state.bed.enclosure3Offset, [axis]: clampOffset(value) } } }));
      },

      // ── C-Arm actions ──────────────────────────────────────────────────
      setCArmPosition: (key, value) => {
        set((state) => {
          const numVal = typeof value === 'string' ? parseFloat(value) : (value as number);
          let clamped = numVal;
          if (key === 'x' || key === 'y' || key === 'z') clamped = clampPosition(numVal);
          const newCArm = { ...state.cArm, [key]: clamped };
          const hasCollision = checkCollision(state.bed, newCArm);
          if (hasCollision && !state.collisionWarning) {
            Promise.resolve().then(() => get().addLog('警告：设备可能发生碰撞', 'warning'));
          }
          return { cArm: newCArm, collisionWarning: hasCollision };
        });
      },
      setCArmRotation: (rotation) => {
        const clamped = clampCArmRotation(rotation);
        set((state) => ({ cArm: { ...state.cArm, cArmRotation: clamped } }));
      },
      setCArmFrontBackRotation: (rotation) => {
        const clamped = clampCArmFrontBackRotation(rotation);
        set((state) => ({ cArm: { ...state.cArm, cArmFrontBackRotation: clamped } }));
      },
      setCArmHeightJoint: (value) => {
        const clamped = clampCArmHeightJoint(value);
        set((state) => ({ cArm: { ...state.cArm, cArmHeightJoint: clamped } }));
      },
      setCArmFrontBackTranslation: (value) => {
        const clamped = clampCArmFrontBackTranslation(value);
        set((state) => ({ cArm: { ...state.cArm, frontBackTranslation: clamped } }));
      },

      // c-arm part 1: c_arm_base
      setCArmBaseOffset: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, baseOffset: { ...state.cArm.baseOffset, [axis]: clampOffset(value) } } }));
      },
      setCArmBaseRotation: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, baseRotation: { ...state.cArm.baseRotation, [axis]: value } } }));
      },
      // c-arm part 1.5: c_arm_column（升降筒立柱）
      setCArmColumnOffset: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, columnOffset: { ...state.cArm.columnOffset, [axis]: clampOffset(value) } } }));
      },
      setCArmColumnRotation: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, columnRotation: { ...state.cArm.columnRotation, [axis]: value } } }));
      },

      // c-arm part 2: c_arm_head
      setCArmHeadOffset: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, headOffset: { ...state.cArm.headOffset, [axis]: clampOffset(value) } } }));
      },
      setCArmHeadRotation: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, headRotation: { ...state.cArm.headRotation, [axis]: value } } }));
      },

      // c-arm part 3: c_arm_ring_no_arm
      setCArmRingNoArmOffset: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, ringNoArmOffset: { ...state.cArm.ringNoArmOffset, [axis]: clampOffset(value) } } }));
      },
      setCArmRingNoArmRotation: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, ringNoArmRotation: { ...state.cArm.ringNoArmRotation, [axis]: value } } }));
      },

      // c-arm part 4: c_arm_ring_arm
      setCArmRingArmOffset: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, ringArmOffset: { ...state.cArm.ringArmOffset, [axis]: clampOffset(value) } } }));
      },
      setCArmRingArmRotation: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, ringArmRotation: { ...state.cArm.ringArmRotation, [axis]: value } } }));
      },

      // Legacy aliases
      setCArmRingOffset: (axis, value) => {
        set((state) => ({ cArm: { ...state.cArm, cArmRingOffset: { ...state.cArm.cArmRingOffset, [axis]: clampOffset(value) } } }));
      },

      // ── Environment ────────────────────────────────────────────────────
      setEnvironment: (key, value) => {
        set((state) => {
          const parts = key.split('.');
          if (parts.length === 1) {
            return { environment: { ...state.environment, [key]: value } };
          }
          const [section, field] = parts as [keyof typeof state.environment, string];
          const sectionVal = state.environment[section];
          if (typeof sectionVal === 'object' && sectionVal !== null) {
            return { environment: { ...state.environment, [section]: { ...(sectionVal as Record<string, unknown>), [field]: value } } };
          }
          return {};
        });
      },

      setInteractionState: (state) => {
        set({ interactionState: state });
        if (state === 'IDLE') {
          set({ interactingPart: null });
        }
      },
      setInteractingPart: (part) => {
        set({ interactingPart: part });
      },
      setBackendConnectionStatus: (status) => {
        set({ backendConnectionStatus: status });
      },
      setSurgeryStage: (stage) => {
        set((state) => ({ surgery: { ...state.surgery, stage } }));
      },

      // ── Logs & Toasts ──────────────────────────────────────────────────
      addLog: (message, type) => {
        const entry: LogEntry = { id: uid(), message, type, timestamp: Date.now() };
        set((state) => ({ logs: [entry, ...state.logs].slice(0, 100) }));
      },
      addToast: (message, type) => {
        const entry: ToastEntry = { id: uid(), message, type, timestamp: Date.now() };
        set((state) => ({ toasts: [...state.toasts, entry] }));
        setTimeout(() => get().removeToast(entry.id), 3000);
      },
      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      // ── Connection ────────────────────────────────────────────────────
      toggleConnection: (device) => {
        set((state) => ({ connection: { ...state.connection, [device]: !state.connection[device] } }));
      },

      // ── Reset / Camera ────────────────────────────────────────────────
      resetPositions: () => {
        set({ bed: { ...DEFAULT_BED }, cArm: { ...DEFAULT_CARM }, collisionWarning: false });
      },
      resetCameraView: () => {
        const { defaultCameraPosition, defaultCameraTarget } = get();
        set({ cameraPosition: defaultCameraPosition, cameraTarget: defaultCameraTarget, isResettingCamera: true });
        get().syncCurrentViewIndex(defaultCameraPosition, defaultCameraTarget);
        setTimeout(() => set({ isResettingCamera: false }), 1000);
      },
      // Used by UI widgets (e.g. view cube) to jump camera quickly.
      setCameraView: (position, target) => {
        set({ cameraPosition: position, cameraTarget: target, isResettingCamera: true });
        get().syncCurrentViewIndex(position, target);
        setTimeout(() => set({ isResettingCamera: false }), 1000);
      },
      setDefaultCameraView: (position, target) => {
        set({ defaultCameraPosition: position, defaultCameraTarget: target });
      },
      applyStandardPreset: () => {
        set({ bed: { ...DEFAULT_BED }, cArm: { ...DEFAULT_CARM }, collisionWarning: false });
      },
      updateCameraPosition: (position, target) => {
        set({ cameraPosition: position, cameraTarget: target });
        get().syncCurrentViewIndex(position, target);
      },
      markCameraAnimationComplete: () => {
        set({ isCameraAnimationComplete: true });
      },
      setSceneInteracting: (interacting) => {
        set({ isSceneInteracting: interacting });
      },
      clearStorage: () => {
        localStorage.removeItem('medical-equipment-storage');
        set({
          bed: { ...DEFAULT_BED }, cArm: { ...DEFAULT_CARM },
          cameraPosition: DEFAULT_CAMERA_POSITION, cameraTarget: DEFAULT_CAMERA_TARGET,
          defaultCameraPosition: DEFAULT_CAMERA_POSITION, defaultCameraTarget: DEFAULT_CAMERA_TARGET,
          collisionWarning: false, logs: [], toasts: [], cameraViews: [], currentViewIndex: -1,
        });
      },

      // ── Presets ───────────────────────────────────────────────────────
      applyPreset: (presetId) => {
        const preset = get().presets.find((p) => p.id === presetId);
        if (!preset) return;
        set({ bed: { ...preset.bed }, cArm: { ...preset.cArm }, collisionWarning: checkCollision(preset.bed, preset.cArm) });
        get().addLog(`已应用预设: ${preset.name}`, 'success');
      },
      setSpaceDevices: (devices) => {
        const previousBed = get().selectedBedDeviceId;
        const previousCArm = get().selectedCArmDeviceId;
        const bedCandidates = devices.filter((d) => !isLikelyCArmDevice(d));
        const cArmCandidates = listCArmDeviceCandidates(devices);

        const nextBed =
          previousBed && bedCandidates.some((device) => device.id === previousBed)
            ? previousBed
            : bedCandidates.find(isLikelyBedDevice)?.id ?? bedCandidates[0]?.id ?? null;

        const nextCArm =
          previousCArm && cArmCandidates.some((device) => device.id === previousCArm)
            ? previousCArm
            : cArmCandidates[0]?.id ?? null;

        set({
          spaceDevices: devices,
          selectedBedDeviceId: nextBed,
          selectedCArmDeviceId: nextCArm,
        });
      },
      setSelectedBedDeviceId: (deviceId) => {
        set({ selectedBedDeviceId: deviceId });
      },
      setSelectedCArmDeviceId: (deviceId) => {
        set({ selectedCArmDeviceId: deviceId });
      },
      setShowBedModelInScene: (visible) => {
        set({ showBedModelInScene: visible });
      },
      setShowCArmModelInScene: (visible) => {
        set({ showCArmModelInScene: visible });
      },
      loadSpaceDevices: async () => {
        try {
          const response = await fetchSpaceDevices();
          if (!response) {
            markBackendReachability(false, get().addLog);
            get().addLog('获取空间设备列表失败', 'warning');
            return;
          }

          markBackendReachability(true, get().addLog);
          const devices = Object.values(response.space);
          
          // 比较设备列表是否有实质性变化，减少无意义更新
          const currentDevices = get().spaceDevices;
          const isSame = devices.length === currentDevices.length && 
            devices.every((d, i) => d.id === currentDevices[i].id);
          
          if (!isSame) {
            get().setSpaceDevices(devices);
            get().addLog(`已获取空间设备列表（${devices.length}台）`, 'success');
          }
        } catch (err) {
          get().addLog('获取设备列表时发生异常', 'warning');
        }
      },
      loadBedPositionFromBackend: async (deviceId) => {
        const targetDeviceId = deviceId ?? get().selectedBedDeviceId;
        if (!targetDeviceId) {
          get().addLog('未选择手术床设备', 'warning');
          return;
        }

        const response = await fetchDevicePosition(targetDeviceId);
        if (!response) {
          get().addLog('获取手术床位置失败', 'warning');
          return;
        }

        _applyDeviceState(targetDeviceId, response.pos);
        get().addLog(`已刷新设备 ${targetDeviceId} 的位姿`, 'success');
      },

      /** 同时从 get_pos 拉当前选中的手术床与 C 臂（各一台对应一个 3D 模型） */
      refreshDevicePositionsFromBackend: async () => {
        try {
          const result = await fetchFullSpaceData();
          if (!result) return;

          set({ 
            backendGlobalError: result.globalError,
            backendDeviceErrors: result.deviceErrors,
          });

          const { selectedBedDeviceId, selectedCArmDeviceId, spaceDevices } = get();
          const cArmBound = resolveCArmBinding(spaceDevices, selectedCArmDeviceId);
          const cArmId = cArmBound?.id ?? null;

          if (selectedBedDeviceId && result.devices[selectedBedDeviceId]) {
            _applyDeviceState(selectedBedDeviceId, result.devices[selectedBedDeviceId]);
          }
          if (cArmId && result.devices[cArmId]) {
            _applyDeviceState(cArmId, result.devices[cArmId]);
          }
        } catch (err) {
          console.error('Failed to refresh device positions:', err);
        }
      },

      // ── Camera views ──────────────────────────────────────────────────
      saveCameraView: (name, position, target) => {
        const view = { id: uid(), name, position, target };
        set((state) => ({ cameraViews: [...state.cameraViews, view] }));
      },
      updateCameraView: (index, updates) => {
        set((state) => {
          if (!state.cameraViews[index]) return {};
          const cameraViews = state.cameraViews.map((view, i) => (
            i === index ? { ...view, ...updates } : view
          ));
          return { cameraViews };
        });
      },
      moveCameraView: (fromIndex, toIndex) => {
        set((state) => {
          if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= state.cameraViews.length ||
            toIndex >= state.cameraViews.length
          ) {
            return {};
          }

          const cameraViews = [...state.cameraViews];
          const [moved] = cameraViews.splice(fromIndex, 1);
          cameraViews.splice(toIndex, 0, moved);

          let currentViewIndex = state.currentViewIndex;
          if (currentViewIndex === fromIndex) {
            currentViewIndex = toIndex;
          } else if (fromIndex < currentViewIndex && toIndex >= currentViewIndex) {
            currentViewIndex -= 1;
          } else if (fromIndex > currentViewIndex && toIndex <= currentViewIndex) {
            currentViewIndex += 1;
          }

          return { cameraViews, currentViewIndex };
        });
      },
      setCurrentViewIndex: (index) => {
        set({ currentViewIndex: index });
      },
      syncCurrentViewIndex: (position, target) => {
        const epsilon = 0.01;
        const isSameTuple = (a: [number, number, number], b: [number, number, number]) => (
          Math.abs(a[0] - b[0]) < epsilon &&
          Math.abs(a[1] - b[1]) < epsilon &&
          Math.abs(a[2] - b[2]) < epsilon
        );

        set((state) => {
          const matchedIndex = state.cameraViews.findIndex((view) => (
            isSameTuple(view.position, position) && isSameTuple(view.target, target)
          ));
          if (matchedIndex === state.currentViewIndex) return {};
          return { currentViewIndex: matchedIndex };
        });
      },
      loadCameraView: (index) => {
        const view = get().cameraViews[index];
        if (!view) return;
        set({ cameraPosition: view.position, cameraTarget: view.target, currentViewIndex: index, isResettingCamera: true });
        setTimeout(() => set({ isResettingCamera: false }), 1000);
      },
      deleteCameraView: (index) => {
        set((state) => ({
          cameraViews: state.cameraViews.filter((_, i) => i !== index),
          currentViewIndex:
            state.currentViewIndex === index
              ? -1
              : state.currentViewIndex > index
                ? state.currentViewIndex - 1
                : state.currentViewIndex,
        }));
      },

      // ── Config import/export ──────────────────────────────────────────
      exportConfig: () => {
        const {
          bed,
          cArm,
          environment,
          presets,
          cameraViews,
          currentViewIndex,
          cameraPosition,
          cameraTarget,
          defaultCameraPosition,
          defaultCameraTarget,
          isMeasuring,
          measurementMode,
          measurements,
          areaMeasurements,
          angleMeasurements,
          annotations,
          isAnnotating,
          selectedAnnotationColor,
        } = get();

        const config = {
          version: '1.1.0',
          bed,
          cArm,
          environment,
          presets,
          scene: {
            cameraViews,
            currentViewIndex,
            cameraPosition,
            cameraTarget,
            defaultCameraPosition,
            defaultCameraTarget,
            isMeasuring,
            measurementMode,
            measurements,
            areaMeasurements,
            angleMeasurements,
            annotations,
            isAnnotating,
            selectedAnnotationColor,
          },
        };
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `equipment-config-${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
      },
      importConfig: (config: unknown) => {
        try {
          const c = config as Record<string, unknown>;
          const scene = (c.scene && typeof c.scene === 'object') ? c.scene as Record<string, unknown> : null;

          if (c.bed)         set({ bed:  c.bed  as BedState });
          if (c.cArm)        set({ cArm: c.cArm as CArmState });
          if (c.environment) set({ environment: c.environment as EquipmentState['environment'] });
          if (Array.isArray(c.presets)) set({ presets: c.presets });

          if (scene) {
            set({
              cameraViews: Array.isArray(scene.cameraViews) ? scene.cameraViews : get().cameraViews,
              currentViewIndex: typeof scene.currentViewIndex === 'number' ? scene.currentViewIndex : get().currentViewIndex,
              cameraPosition: Array.isArray(scene.cameraPosition) ? scene.cameraPosition as [number, number, number] : get().cameraPosition,
              cameraTarget: Array.isArray(scene.cameraTarget) ? scene.cameraTarget as [number, number, number] : get().cameraTarget,
              defaultCameraPosition: Array.isArray(scene.defaultCameraPosition) ? scene.defaultCameraPosition as [number, number, number] : get().defaultCameraPosition,
              defaultCameraTarget: Array.isArray(scene.defaultCameraTarget) ? scene.defaultCameraTarget as [number, number, number] : get().defaultCameraTarget,
              isMeasuring: typeof scene.isMeasuring === 'boolean' ? scene.isMeasuring : get().isMeasuring,
              measurementMode: (scene.measurementMode === 'distance' || scene.measurementMode === 'area' || scene.measurementMode === 'angle')
                ? scene.measurementMode
                : get().measurementMode,
              measurements: Array.isArray(scene.measurements) ? scene.measurements : get().measurements,
              areaMeasurements: Array.isArray(scene.areaMeasurements) ? scene.areaMeasurements : get().areaMeasurements,
              angleMeasurements: Array.isArray(scene.angleMeasurements) ? scene.angleMeasurements : get().angleMeasurements,
              annotations: Array.isArray(scene.annotations) ? scene.annotations : get().annotations,
              isAnnotating: typeof scene.isAnnotating === 'boolean' ? scene.isAnnotating : get().isAnnotating,
              selectedAnnotationColor: typeof scene.selectedAnnotationColor === 'string'
                ? scene.selectedAnnotationColor
                : get().selectedAnnotationColor,
            });
          } else if (Array.isArray(c.cameraViews)) {
            set({ cameraViews: c.cameraViews });
          }

          get().addLog('配置已导入', 'success');
        } catch { get().addLog('配置导入失败', 'warning'); }
      },
      initializeBackendSync: () => {
        _backendReachable = null;
        void get().loadFromBackend({ silent: true }).catch(() => {});
        startBackendPolling(() => get().loadFromBackend({ silent: true }), get().addToast, 100);
      },
      cleanupBackendSync: () => {
        _backendReachable = null;
        stopBackendPolling();
        if (_syncDebounceHandle !== null) {
          clearTimeout(_syncDebounceHandle);
          _syncDebounceHandle = null;
        }
      },
      syncToBackend: async () => {
        try {
          const { lastUpdateSource } = get();

          // 后端回流更新不再反向上报，避免回环同步
          if (lastUpdateSource === 'backend') {
            set({ lastUpdateSource: 'ui' });
            return;
          }

          // 当前 pad 端控制统一走 moveJoint / applyPreset，不走 bulk state 同步接口。
          set({ interactionState: 'IDLE' });
        } catch {
          get().addLog('后端同步失败', 'warning');
          set({ interactionState: 'IDLE' });
        }
      },
      applyBackendDeviceState: (incoming) => {
        if (incoming.timestamp <= get().lastBackendTimestamp) {
          return false;
        }

        if (incoming.device === 'surgical_bed' && incoming.state.bed) {
          const bedData = incoming.state.bed;
          set((state) => ({
            bed: {
              ...state.bed,
              x: normalizeBackendLinear(bedData.position.x),
              y: normalizeBackendLinear(bedData.position.y),
              z: normalizeBackendLinear(bedData.position.z),
              rotX: bedData.rotation.x,
              rotY: bedData.rotation.y,
              tilt: bedData.rotation.z,
              height: fromBackendBedHeight(
                pickBedHeightJointValue(bedData.joints, state.bed.height)
              ),
              trendelenburg: clampBedTrendelenburg(bedData.joints.bed_tilt_joint),
              lateral: clampBedLateral(bedData.joints.bed_lateral_joint),
              backrestAngle: clampBedBackrestAngle(bedData.joints.bed_panel_back_joint),
              rightLegAngle: clampBedLegAngle(bedData.joints.bed_panel_right_leg_joint),
              leftLegAngle: clampBedLegAngle(bedData.joints.bed_panel_left_leg_joint),
              frontBackPosition: clampBedFrontBackPosition(normalizeBackendJointLinear(
                pickBedFrontBackJointValue(bedData.joints, state.bed.frontBackPosition)
              )),
            },
            lastUpdateSource: 'backend',
            lastBackendTimestamp: incoming.timestamp,
          }));
          return true;
        }

        if (incoming.device === 'c_arm' && incoming.state.cArm) {
          const cArmData = incoming.state.cArm;
          set((state) => ({
            cArm: {
              ...state.cArm,
              x: normalizeBackendLinear(cArmData.position.x),
              y: normalizeBackendLinear(cArmData.position.y),
              z: normalizeBackendLinear(cArmData.position.z),
              caud: cArmData.rotation.x,
              rao: cArmData.rotation.y,
              rotZ: cArmData.rotation.z,
              cArmHeightJoint: normalizeBackendLinear(cArmData.joints.arm_height_joint),
              cArmRotation: cArmData.joints.arm_tilt_joint,
              cArmFrontBackRotation: cArmData.joints.c_ring_rotation_joint,
              frontBackTranslation: clampCArmFrontBackTranslation(normalizeBackendLinear(
                cArmData.joints.arm_front_back_joint ?? cArmData.joints.front_back_translation_joint ?? state.cArm.frontBackTranslation
              )),
            },
            lastUpdateSource: 'backend',
            lastBackendTimestamp: incoming.timestamp,
          }));
          return true;
        }

        return false;
      },
      loadFromBackend: async (options) => {
        if (get().interactionState === 'USER_INTERACTING') return; // 仅在用户拖动中暂停同步，等待后端回流阶段允许拉取
        const silent = options?.silent ?? false;
        const startTime = performance.now();

        try {
          // 单次请求获取所有数据，修复冗余请求导致的 AbortError (timeout)
          const result = await fetchFullSpaceData();
          const latency = Math.round(performance.now() - startTime);
          
          if (!result) {
            set({ backendConnectionStatus: 'disconnected', backendLatency: latency });
            return;
          }

          // 如果延迟过高（>500ms），显示为“降级”状态
          const status: BackendConnectionStatus = latency > 500 ? 'degraded' : 'connected';

          set({ 
            backendConnectionStatus: status, 
            backendLatency: latency,
            backendServerError: '',
            backendGlobalError: result.globalError,
            backendDeviceErrors: result.deviceErrors,
          });

          const { selectedBedDeviceId, selectedCArmDeviceId, spaceDevices } = get();
          const cArmBound = resolveCArmBinding(spaceDevices, selectedCArmDeviceId);
          const cArmId = cArmBound?.id ?? null;

          // 1. 手术床位姿更新
          if (selectedBedDeviceId) {
            const bedData = result.devices[selectedBedDeviceId];
            if (bedData) {
              _applyDeviceState(selectedBedDeviceId, bedData);
            }
          }

          // 2. C臂位姿更新
          if (cArmId) {
            const cArmData = result.devices[cArmId];
            if (cArmData) {
              _applyDeviceState(cArmId, cArmData);
            }
          }

          if (silent) {
            _lastBackendLoadLogAt = Date.now();
          } else {
            const now = Date.now();
            if (now - _lastBackendLoadLogAt >= BACKEND_STATE_LOG_COOLDOWN_MS) {
              _lastBackendLoadLogAt = now;
              get().addLog(`已从后端加载空间设备位姿`, 'success');
            }
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          set({ 
            backendConnectionStatus: 'disconnected',
            backendServerError: errMsg.includes('500') ? '后端内部错误 (500)：请检查后端程序日志或硬件连接' : ''
          });
          if (!silent) {
            get().addLog(`从后端加载失败: ${errMsg}`, 'warning');
          }
          throw err; // 重新抛出，让轮询器能触发熔断逻辑
        }
      },
      setLastUpdateSource: (source) => {
        set({ lastUpdateSource: source });
      },
      setLastBackendTimestamp: (timestamp) => {
        set({ lastBackendTimestamp: timestamp });
      },

      // ── Measurements ──────────────────────────────────────────────────
      toggleMeasuring: () => {
        set((state) => ({ isMeasuring: !state.isMeasuring, measurementPoints: [] }));
      },
      setMeasurementMode: (mode) => {
        set({ measurementMode: mode, measurementPoints: [] });
      },
      addMeasurement: (startPoint, endPoint) => {
        const dx = endPoint[0]-startPoint[0], dy = endPoint[1]-startPoint[1], dz = endPoint[2]-startPoint[2];
        const distance = Math.sqrt(dx*dx+dy*dy+dz*dz) * WORLD_TO_MM;
        set((state) => ({ measurements: [...state.measurements, { id: uid(), startPoint, endPoint, distance }] }));
      },
      addAreaMeasurement: (points) => {
        let area = 0; const n = points.length;
        for (let i = 0; i < n; i++) { const j=(i+1)%n; area+=points[i][0]*points[j][2]; area-=points[j][0]*points[i][2]; }
        area = Math.abs(area) / 2 * WORLD_TO_MM * WORLD_TO_MM;
        set((state) => ({ areaMeasurements: [...state.areaMeasurements, { id: uid(), points, area }] }));
      },
      addAngleMeasurement: (points) => {
        const [p1,vertex,p2]=points;
        const v1=[p1[0]-vertex[0],p1[1]-vertex[1],p1[2]-vertex[2]];
        const v2=[p2[0]-vertex[0],p2[1]-vertex[1],p2[2]-vertex[2]];
        const dot=v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2];
        const mag1=Math.sqrt(v1[0]**2+v1[1]**2+v1[2]**2);
        const mag2=Math.sqrt(v2[0]**2+v2[1]**2+v2[2]**2);
        const angle=Math.acos(Math.max(-1,Math.min(1,dot/(mag1*mag2))))*(180/Math.PI);
        set((state) => ({ angleMeasurements: [...state.angleMeasurements, { id: uid(), points, angle }] }));
      },
      removeMeasurement: (id) => {
        set((state) => ({ measurements: state.measurements.filter((m) => m.id !== id) }));
      },
      removeAreaMeasurement: (id) => {
        set((state) => ({ areaMeasurements: state.areaMeasurements.filter((m) => m.id !== id) }));
      },
      removeAngleMeasurement: (id) => {
        set((state) => ({ angleMeasurements: state.angleMeasurements.filter((m) => m.id !== id) }));
      },
      clearMeasurements: () => {
        set({ measurements: [], areaMeasurements: [], angleMeasurements: [], measurementPoints: [] });
      },

      // ── Annotations ───────────────────────────────────────────────────
      toggleAnnotating: () => {
        set((state) => ({ isAnnotating: !state.isAnnotating }));
      },
      addAnnotation: (position, text, color) => {
        const entry: Annotation = { id: uid(), position, text, color };
        set((state) => ({ annotations: [...state.annotations, entry] }));
      },
      updateAnnotation: (id, text, color) => {
        set((state) => ({ annotations: state.annotations.map((a) => a.id===id ? { ...a, text, color } : a) }));
      },
      removeAnnotation: (id) => {
        set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) }));
      },
      clearAnnotations: () => { set({ annotations: [] }); },
      exportAnnotations: () => {
        const { annotations } = get();
        const blob = new Blob([JSON.stringify(annotations, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `annotations-${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
      },
      importAnnotations: (annotations: Annotation[]) => {
        set({ annotations });
        get().addLog(`已导入 ${annotations.length} 个标注`, 'success');
      },
      setSelectedAnnotationColor: (color) => { set({ selectedAnnotationColor: color }); },

      // ── Preset panel ──────────────────────────────────────────────────
      togglePresetPanel: () => {
        set((state) => ({ showPresetPanel: !state.showPresetPanel }));
      },
      setActiveTab: (tab) => { set({ activeTab: tab }); },

      // ── Part resets ───────────────────────────────────────────────────
      resetBedParts: () => {
        set((state) => ({
          bed: {
            ...state.bed,
            x: 0, y: 0, z: 0,
            rotX: 0, rotY: 0,
            baseOffset:            zeroXYZ(),
            baseRotation:          zeroXYZ(),
            surfaceOffset:         zeroXYZ(),
            surfaceRotation:       zeroXYZ(),
            panelMidOffset:        zeroXYZ(),
            panelMidRotation:      zeroXYZ(),
            panelRightLegOffset:   zeroXYZ(),
            panelRightLegRotation: zeroXYZ(),
            panelLeftLegOffset:    zeroXYZ(),
            panelLeftLegRotation:  zeroXYZ(),
            panelBackOffset:       zeroXYZ(),
            panelBackRotation:     zeroXYZ(),
            enclosure1Offset:      zeroXYZ(),
            enclosure2Offset:      zeroXYZ(),
            enclosure3Offset:      zeroXYZ(),
          },
        }));
      },
      resetCArmParts: () => {
        set((state) => ({
          cArm: {
            ...state.cArm,
            x: 0, y: 0, z: 0,
            rao: 0, caud: 0, rotZ: 0,
            baseOffset:            zeroXYZ(),
            baseRotation:          zeroXYZ(),
            columnOffset:          zeroXYZ(),
            columnRotation:        zeroXYZ(),
            headOffset:            zeroXYZ(),
            headRotation:          zeroXYZ(),
            ringNoArmOffset:       zeroXYZ(),
            ringNoArmRotation:     zeroXYZ(),
            ringArmOffset:         zeroXYZ(),
            ringArmRotation:       zeroXYZ(),
            cArmRotation:          0,
            cArmFrontBackRotation: 0,
            cArmHeightJoint:       350,
          },
        }));
      },
      setModelLoadProgress: (model, progress) => {
        set((state) => ({
          modelLoadProgress: {
            ...state.modelLoadProgress,
            [model]: Math.min(100, Math.max(0, progress)),
          },
        }));
      },
    });
    },
    {
      name: 'medical-equipment-storage',
      version: 16,
      migrate: (persisted, version) => {
        const s = persisted as Partial<EquipmentState>;
        if (version < 2) {
          if (s.bed)  s.bed  = { ...DEFAULT_BED,  ...s.bed };
          if (s.cArm) s.cArm = { ...DEFAULT_CARM, ...s.cArm };
        }
        if (version < 3) {
          if (s.cArm) s.cArm = {
            ...DEFAULT_CARM,
            ...s.cArm,
            cArmRotation: 0,
            cArmFrontBackRotation: 0,
          };
        }
        if (version < 4) {
          if (s.cArm) s.cArm = {
            ...DEFAULT_CARM,
            ...s.cArm,
            cArmRotation:          0,
            cArmFrontBackRotation: 0,
            cArmHeightJoint:       0,
          };
        }
        if (version < 5) {
          if (s.cArm) s.cArm = {
            ...DEFAULT_CARM,
            ...s.cArm,
            cArmRotation:          0,
            cArmFrontBackRotation: 0,
            cArmHeightJoint:       0,
          };
        }
        if (version < 6) {
          // URDF v4：arm_tilt_joint 改为X轴（②斜臂旋转），c_ring_rotation_joint 改为Y轴（③C环前后滚）
          // 重置所有C臂关节值，避免旧缓存轴向混淆
          if (s.cArm) s.cArm = {
            ...DEFAULT_CARM,
            cArmRotation:          0,
            cArmFrontBackRotation: 0,
            cArmHeightJoint:       0,
          };
        }
        if (version < 7) {
          // 新增床面板四个部件的独立偏移字段
          if (s.bed) s.bed = {
            ...DEFAULT_BED,
            ...s.bed,
            panelMidOffset:        zeroXYZ(),
            panelMidRotation:      zeroXYZ(),
            panelRightLegOffset:   zeroXYZ(),
            panelRightLegRotation: zeroXYZ(),
            panelLeftLegOffset:    zeroXYZ(),
            panelLeftLegRotation:  zeroXYZ(),
            panelBackOffset:       zeroXYZ(),
            panelBackRotation:     zeroXYZ(),
          };
        }
        if (version < 8) {
          // 背板 joint 改为 revolute，重置 backrestAngle 避免旧缓存影响
          if (s.bed) s.bed = { ...DEFAULT_BED, ...s.bed, backrestAngle: 0 };
        }
        if (version < 9) {
          // 4个面板 parent 从 base_link 改为 bed_lateral_link
          // Trendelenburg / Lateral 现在直接带动面板，重置相关角度避免旧缓存偏移
          if (s.bed) s.bed = { ...DEFAULT_BED, ...s.bed, trendelenburg: 0, lateral: 0 };
        }
        if (version < 10) {
          // 单位统一到 mm：
          // - bed.height: cm -> mm
          // - bed.frontBackPosition: cm -> mm
          // - cArm.cArmHeightJoint: cm -> mm
          if (s.bed) {
            s.bed = {
              ...DEFAULT_BED,
              ...s.bed,
              height: ((s.bed.height ?? DEFAULT_BED.height) as number) * 10,
              frontBackPosition: ((s.bed.frontBackPosition ?? DEFAULT_BED.frontBackPosition) as number) * 10,
            };
          }
          if (s.cArm) {
            s.cArm = {
              ...DEFAULT_CARM,
              ...s.cArm,
              cArmHeightJoint: ((s.cArm.cArmHeightJoint ?? DEFAULT_CARM.cArmHeightJoint) as number) * 10,
            };
          }
        }
        if (version < 11) {
          // 将④前后移动默认改为 0，并覆盖旧缓存值，确保刷新后模型状态一致
          if (s.cArm) {
            s.cArm = {
              ...DEFAULT_CARM,
              ...s.cArm,
              frontBackTranslation: 0,
            };
          }
        }
        if (version < 12) {
          // 统一④前后移动为真实物理位移值（范围 -1500~1500），将旧偏移制缓存(0~3000)迁移回来
          if (s.cArm) {
            const legacy = Number(s.cArm.frontBackTranslation ?? DEFAULT_CARM.frontBackTranslation);
            const migrated = legacy > 1500 ? legacy - 1500 : legacy;
            s.cArm = {
              ...DEFAULT_CARM,
              ...s.cArm,
              frontBackTranslation: Math.max(-1500, Math.min(1500, migrated)),
            };
          }
        }
        if (version < 13) {
          // 默认视角调低，避免刷新后相机过高；仅迁移仍为旧默认值的相机参数
          const legacyDefaultPos = Array.isArray((s as { defaultCameraPosition?: unknown }).defaultCameraPosition)
            ? (s as { defaultCameraPosition?: [number, number, number] }).defaultCameraPosition
            : null;
          const legacyCameraPos = Array.isArray((s as { cameraPosition?: unknown }).cameraPosition)
            ? (s as { cameraPosition?: [number, number, number] }).cameraPosition
            : null;
          if (!legacyDefaultPos || Math.abs(legacyDefaultPos[1] - 3) < 1e-6) {
            (s as { defaultCameraPosition?: [number, number, number] }).defaultCameraPosition = [4, 2.1, -4];
          }
          if (!legacyCameraPos || Math.abs(legacyCameraPos[1] - 3) < 1e-6) {
            (s as { cameraPosition?: [number, number, number] }).cameraPosition = [4, 2.1, -4];
          }
        }
        if (version < 14) {
          // 使用并行手术床 v2 网格后，清空旧床部件补偿，避免各关节离体
          if (s.bed) {
            s.bed = {
              ...DEFAULT_BED,
              ...s.bed,
              baseOffset: zeroXYZ(),
              baseRotation: zeroXYZ(),
              surfaceOffset: zeroXYZ(),
              surfaceRotation: zeroXYZ(),
              panelMidOffset: zeroXYZ(),
              panelMidRotation: zeroXYZ(),
              panelRightLegOffset: zeroXYZ(),
              panelRightLegRotation: zeroXYZ(),
              panelLeftLegOffset: zeroXYZ(),
              panelLeftLegRotation: zeroXYZ(),
              panelBackOffset: zeroXYZ(),
              panelBackRotation: zeroXYZ(),
              enclosure1Offset: zeroXYZ(),
              enclosure2Offset: zeroXYZ(),
              enclosure3Offset: zeroXYZ(),
            };
          }
        }
        if (version < 15) {
          // 将④前后移动默认改为 0，并迁移旧缓存值
          if (s.cArm) {
            s.cArm = {
              ...DEFAULT_CARM,
              ...s.cArm,
              frontBackTranslation: 0,
            };
          }
        }
        if (version < 16) {
          // 默认视角高度改为 y=1；仅迁移仍为旧默认值的相机参数
          const legacyDefaultPos = Array.isArray((s as { defaultCameraPosition?: unknown }).defaultCameraPosition)
            ? (s as { defaultCameraPosition?: [number, number, number] }).defaultCameraPosition
            : null;
          const legacyCameraPos = Array.isArray((s as { cameraPosition?: unknown }).cameraPosition)
            ? (s as { cameraPosition?: [number, number, number] }).cameraPosition
            : null;
          if (!legacyDefaultPos || Math.abs(legacyDefaultPos[1] - 2.1) < 1e-6 || Math.abs(legacyDefaultPos[1] - 3) < 1e-6) {
            (s as { defaultCameraPosition?: [number, number, number] }).defaultCameraPosition = [4, 1, -4];
          }
          if (!legacyCameraPos || Math.abs(legacyCameraPos[1] - 2.1) < 1e-6 || Math.abs(legacyCameraPos[1] - 3) < 1e-6) {
            (s as { cameraPosition?: [number, number, number] }).cameraPosition = [4, 1, -4];
          }
        }
        // 确保非持久化字段有安全默认值
        const out = persisted as EquipmentState & Actions;
        if (!Array.isArray((out as unknown as Record<string,unknown>).toasts)) {
          (out as unknown as Record<string,unknown>).toasts = [];
        }
        return out;
      },
      partialize: (state) => ({
        bed:                   state.bed,
        cArm:                  state.cArm,
        environment:           state.environment,
        presets:               state.presets,
        cameraViews:           state.cameraViews,
        defaultCameraPosition: state.defaultCameraPosition,
        defaultCameraTarget:   state.defaultCameraTarget,
        annotations:           state.annotations,
      }),
    }
  )
);

