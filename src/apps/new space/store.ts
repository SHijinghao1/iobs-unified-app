/**
 * @file store.ts
 * @description 手术室应用状态管理，使用 Zustand 管理全局状态
 * @author IOBS Team
 * @date 2024-01-01
 */

import { create } from 'zustand';

import { sendEmergencyStop as apiSendEmergencyStop } from './services/iobsApi';
import {
  fetchNewSpaceBedStatusList,
  applyNewSpaceBedStatusById,
  fetchNewSpaceDemoList,
  applyNewSpaceDemoById,
} from './services/presetApi';
import {
  fetchNewSpaceCArmMode,
  setNewSpaceCArmMode,
  setNewSpaceCArmJointMove,
} from './services/carmApi';
import { setNewSpaceBedJointMove } from './services/bedApi';
import { startBackendPolling, stopBackendPolling } from './store/backendSync';
import { fetchFullSpaceData, fetchSpaceDevices, syncDeviceState, fetchDeviceState } from './services/iobsApi';
import { mapBackendBedToScene, mapBackendCArmToScene, mapSceneBedToBackend, mapSceneCArmToBackend } from './store/mappers';
import { isLikelyBedDevice, resolveCArmBinding } from './utils/spaceDeviceBindings';

import {
  DEFAULT_NEW_SPACE_CAMERA_POSITION,
  DEFAULT_NEW_SPACE_CAMERA_TARGET,
  DEFAULT_NEW_SPACE_BED,
  DEFAULT_NEW_SPACE_CARM,
  DEFAULT_BED_JOINT_SPEEDS,
} from './constants/defaults';

import {
  HEIGHT_MOVE_JOINT,
  FRONT_BACK_MOVE_JOINT,
  BED_CONTROL_DIRECTION_MAP,
  IGNORE_BACKEND_AFTER_COMMAND_MS,
  AWAITING_BACKEND_TIMEOUT_MS,
  DIRECTION_LABEL_MAP,
} from './store/constants';

import {
  getLastUserCommandAt,
  scheduleSyncToBackend,
  sortStatusItems,
  generateToastId,
} from './store/helpers';

import type { NewSpaceStore } from './store/storeTypes';

export type {
  NewSpaceInteractionState,
  NewSpaceSceneBedState,
  NewSpaceSceneCArmState,
  NewSpaceToastType,
  NewSpaceToastItem,
  BackendConnectionStatus,
  LastUpdateSource,
  IncomingBackendDeviceState,
} from './types/store';

export type { SpaceDeviceInfo } from './types/space';

export {
  DEFAULT_NEW_SPACE_CAMERA_POSITION,
  DEFAULT_NEW_SPACE_CAMERA_TARGET,
  DEFAULT_NEW_SPACE_BED,
  DEFAULT_NEW_SPACE_CARM,
};

export const useNewSpaceStore = create<NewSpaceStore>((set, get) => ({
  toasts: [],
  selectedTelemetryModuleId: null,
  cArmRotation: 0,
  cArmFrontBackRotation: 0,
  cArmHeightJoint: 350,
  frontBackTranslation: 150,
  bedInteractionState: 'IDLE',
  bedInteractingPart: null,
  cArmInteractionState: 'IDLE',
  cArmInteractingPart: null,
  lastUpdateSource: 'ui',
  backendConnectionStatus: 'disconnected',
  backendLatency: 0,
  backendGlobalError: '',
  backendDeviceErrors: [],
  backendServerError: '',
  lastBackendTimestamp: 0,
  spaceDevices: [],
  selectedBedDeviceId: null,
  selectedCArmDeviceId: null,
  cArmModeState: 0,
  cArmModeLoading: false,
  cArmLoadingJoint: null,
  presetLoading: false,
  presetApplyingId: null,
  presetLastAppliedId: null,
  presetIsTwoColumn: false,
  presetSource: 'current',
  presetQuery: '',
  presetItems: [],
  presetKeyOrder: [],
  presetBrokenImageIds: {},
  bedJointSpeeds: { ...DEFAULT_BED_JOINT_SPEEDS },
  bed: DEFAULT_NEW_SPACE_BED,
  cArm: DEFAULT_NEW_SPACE_CARM,
  bedRawJoints: {},
  cArmRawJoints: {},
  bedStateName: '',
  bedStateProgress: 0,
  cameraPosition: DEFAULT_NEW_SPACE_CAMERA_POSITION,
  cameraTarget: DEFAULT_NEW_SPACE_CAMERA_TARGET,
  isResettingCamera: false,
  showBedModelInScene: true,
  showCArmModelInScene: true,
  isMeasuring: false,
  isAnnotating: false,
  isSceneInteracting: false,
  sceneLocked: false,
  emergencyStopping: false,

  setBedJointSpeed: (joint, speed) => set((state) => ({
    bedJointSpeeds: { ...state.bedJointSpeeds, [joint]: speed },
  })),

  // 临时测试：直接设置床板角度（不经过后端）
  setBedAngle: (key: string, value: number) => set((state) => ({
    bed: { ...state.bed, [key]: value },
  })),

  pushToast: (message, type = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: generateToastId(), message, type }].slice(-4),
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  setSelectedTelemetryModuleId: (id) => set({ selectedTelemetryModuleId: id }),

  requireSelectedTelemetryModule: () => {
    const selected = get().selectedTelemetryModuleId;
    if (!selected) {
      get().pushToast('请先在右侧传感器遥测中选择一个模块', 'warning');
      return null;
    }
    return selected;
  },

  sendBedTelemetryModuleMove: async (direction) => {
    const selected = get().requireSelectedTelemetryModule();
    if (!selected) return;

    const config = BED_CONTROL_DIRECTION_MAP[selected];
    if (!config) {
      get().pushToast(`未配置模块控制映射：${selected}`, 'error');
      return;
    }

    let actualJoint = selected;
    if (selected === 'bed_height_joint') {
      actualJoint = HEIGHT_MOVE_JOINT;
    } else if (selected === 'bed_front_back_joint') {
      actualJoint = FRONT_BACK_MOVE_JOINT;
    }

    const userSpeed = get().bedJointSpeeds[selected] ?? config.speed;
    const signedSpeed = config.axis[direction] * userSpeed;
    const result = await setNewSpaceBedJointMove(actualJoint, signedSpeed);

    if (!result.ok) {
      get().pushToast(`床控动作失败：${result.error || 'unknown_error'}`, 'error');
      return;
    }

    scheduleSyncToBackend(() => get().syncToBackend());
    get().pushToast(`已发送 ${selected} ${DIRECTION_LABEL_MAP[direction]} 控制`, 'success');
  },

  sendBedJointMoveWithSpeed: async (joint, speed) => {
    let actualJoint = joint;
    if (joint === 'bed_height_joint') {
      actualJoint = HEIGHT_MOVE_JOINT;
    } else if (joint === 'bed_front_back_joint') {
      actualJoint = FRONT_BACK_MOVE_JOINT;
    }

    const result = await setNewSpaceBedJointMove(actualJoint, speed);

    if (!result.ok) {
      get().pushToast(`关节动作失败：${result.error || 'unknown_error'}`, 'error');
      throw new Error(result.error || 'unknown_error');
    }

    if (speed !== 0) {
      get().pushToast(`已发送 ${joint} 速度 ${speed}`, 'success');
    }
  },

  setCArmRotation: (value) => set((state) => ({ cArmRotation: value, cArm: { ...state.cArm, cArmRotation: value } })),
  setCArmFrontBackRotation: (value) => set((state) => ({ cArmFrontBackRotation: value, cArm: { ...state.cArm, cArmFrontBackRotation: value } })),
  setCArmHeightJoint: (value) => set((state) => ({ cArmHeightJoint: value, cArm: { ...state.cArm, cArmHeightJoint: value } })),
  setCArmFrontBackTranslation: (value) => set((state) => ({ frontBackTranslation: value, cArm: { ...state.cArm, frontBackTranslation: value } })),
  setBedInteractionState: (value) => {
    set({ bedInteractionState: value });
    if (value === 'AWAITING_BACKEND_UPDATE') {
      setTimeout(() => {
        const current = useNewSpaceStore.getState();
        if (current.bedInteractionState === 'AWAITING_BACKEND_UPDATE') {
          useNewSpaceStore.setState({ bedInteractionState: 'IDLE', bedInteractingPart: null });
        }
      }, AWAITING_BACKEND_TIMEOUT_MS);
    }
  },
  setBedInteractingPart: (value) => set({ bedInteractingPart: value }),
  setCArmInteractionState: (value) => {
    set({ cArmInteractionState: value });
    if (value === 'AWAITING_BACKEND_UPDATE') {
      setTimeout(() => {
        const current = useNewSpaceStore.getState();
        if (current.cArmInteractionState === 'AWAITING_BACKEND_UPDATE') {
          useNewSpaceStore.setState({ cArmInteractionState: 'IDLE', cArmInteractingPart: null });
        }
      }, AWAITING_BACKEND_TIMEOUT_MS);
    }
  },
  setCArmInteractingPart: (value) => set({ cArmInteractingPart: value }),

  resetLocalCArmPose: () => {
    set((state) => ({
      cArmHeightJoint: 350,
      cArmRotation: 0,
      cArmFrontBackRotation: 0,
      frontBackTranslation: 150,
      cArm: {
        ...state.cArm,
        cArmHeightJoint: 350,
        cArmRotation: 0,
        cArmFrontBackRotation: 0,
        frontBackTranslation: 150,
      },
    }));
    get().pushToast('C臂关节已本地重置', 'info');
  },

  hydrateCArmMode: async () => {
    try {
      const mode = await fetchNewSpaceCArmMode();
      if (mode) set({ cArmModeState: mode.mode });
    } catch (error) {
      console.error('[hydrateCArmMode] Error:', error);
      get().pushToast('获取C臂模式失败', 'error');
    }
  },

  applyCArmMode: async (mode) => {
    set({ cArmModeLoading: true });
    try {
      const ok = await setNewSpaceCArmMode(mode);
      if (ok) {
        set({ cArmModeState: mode });
        scheduleSyncToBackend(() => get().syncToBackend());
        get().pushToast(`已成功切换为 ${mode === 1 ? '同步' : mode === -1 ? '镜像' : '脱离'} 模式`, 'success');
      } else {
        get().pushToast('模式切换失败', 'error');
      }
    } finally {
      set({ cArmModeLoading: false });
    }
  },

  sendCArmJointMove: async (joint, speed) => {
    set({ cArmLoadingJoint: joint });
    try {
      const result = await setNewSpaceCArmJointMove(joint, speed);
      if (!result.ok) {
        get().pushToast(`关节动作失败：${result.error || 'unknown_error'}`, 'error');
        return;
      }
      scheduleSyncToBackend(() => get().syncToBackend());
      get().pushToast(`已发送 ${joint} 速度 ${speed}`, 'success');
    } finally {
      set({ cArmLoadingJoint: null });
    }
  },

  setPresetIsTwoColumn: (value) => set((state) => ({ presetIsTwoColumn: typeof value === 'function' ? value(state.presetIsTwoColumn) : value })),
  setPresetSource: (value) => set({ presetSource: value }),
  setPresetQuery: (value) => set({ presetQuery: value }),
  setPresetLoading: (value) => set({ presetLoading: value }),
  setPresetApplyingId: (value) => set({ presetApplyingId: value }),
  setPresetLastAppliedId: (value) => set({ presetLastAppliedId: value }),
  setPresetItems: (value) => set({ presetItems: value }),
  setPresetKeyOrder: (value) => set((state) => ({ presetKeyOrder: typeof value === 'function' ? value(state.presetKeyOrder) : value })),
  setPresetBrokenImageIds: (value) => set((state) => ({ presetBrokenImageIds: typeof value === 'function' ? value(state.presetBrokenImageIds) : value })),

  loadPresetStatusList: async (source) => {
    const activeSource = source ?? get().presetSource;
    set({ presetLoading: true });
    try {
      const resp = activeSource === 'demo' ? await fetchNewSpaceDemoList() : await fetchNewSpaceBedStatusList();
      if (!resp) {
        set({ presetItems: [], presetBrokenImageIds: {} });
        get().pushToast(activeSource === 'demo' ? '后端不可达，无法加载 demo 列表' : '后端不可达，无法加载姿态列表', 'warning');
        return;
      }

      if (resp.error) {
        get().pushToast(`${activeSource === 'demo' ? '获取 demo 列表失败' : '获取姿态列表失败'}：${resp.error}`, 'warning');
      }

      const next = sortStatusItems(Object.entries(resp.status).map(([id, item]) => ({ id, item })));
      set({ presetItems: next, presetBrokenImageIds: {} });
    } finally {
      set({ presetLoading: false });
    }
  },

  applyPresetById: async (id) => {
    set({ presetApplyingId: id });
    try {
      const source = get().presetSource;
      const result = source === 'demo' ? await applyNewSpaceDemoById(id) : await applyNewSpaceBedStatusById(id);
      if (!result.ok) {
        get().pushToast(result.error ? `应用失败：${result.error}` : '应用失败', 'error');
        return;
      }
      get().pushToast(`已应用${source === 'demo' ? ' demo ' : '姿态 '}${id}`, 'success');
      set({ presetLastAppliedId: id });
    } finally {
      set({ presetApplyingId: null });
    }
  },

  updateCameraPosition: (position, target) => set({ cameraPosition: position, cameraTarget: target }),
  setSceneInteracting: (interacting) => set({ isSceneInteracting: interacting }),
  setSceneLocked: (locked) => set({ sceneLocked: locked }),
  setShowBedModelInScene: (visible) => set({ showBedModelInScene: visible }),
  setShowCArmModelInScene: (visible) => set({ showCArmModelInScene: visible }),
  toggleMeasuring: () => set((state) => ({ isMeasuring: !state.isMeasuring, isAnnotating: state.isMeasuring ? state.isAnnotating : false })),
  toggleAnnotating: () => set((state) => ({ isAnnotating: !state.isAnnotating, isMeasuring: state.isAnnotating ? state.isMeasuring : false })),

  loadSpaceDevices: async () => {
    const response = await fetchSpaceDevices();
    if (!response) {
      get().pushToast('无法获取设备列表', 'error');
      return;
    }
    const devices = Object.values(response.space);
    set({ spaceDevices: devices });

    const bedCandidates = devices.filter(isLikelyBedDevice);
    if (bedCandidates.length > 0 && !get().selectedBedDeviceId) {
      set({ selectedBedDeviceId: bedCandidates[0].id });
    }

    const cArmDevice = resolveCArmBinding(devices, get().selectedCArmDeviceId);
    if (cArmDevice) {
      set({ selectedCArmDeviceId: cArmDevice.id });
    }
  },

  setSelectedBedDeviceId: (deviceId) => set({ selectedBedDeviceId: deviceId }),
  setSelectedCArmDeviceId: (deviceId) => set({ selectedCArmDeviceId: deviceId }),

  applyBackendDeviceState: (incoming) => {
    if (Date.now() - getLastUserCommandAt() < IGNORE_BACKEND_AFTER_COMMAND_MS) {
      return false;
    }

    const { device, state } = incoming;

    if (device === 'surgical_bed' && state.bed) {
      const sceneBed = mapBackendBedToScene(state.bed as Partial<import('./store/mappers').BackendBedState>);
      set((prev) => ({
        bed: { ...prev.bed, ...sceneBed },
        lastUpdateSource: 'backend',
        bedInteractionState: 'IDLE',
        bedInteractingPart: null,
      }));
      return true;
    }

    if (device === 'c_arm' && state.cArm) {
      const sceneCArm = mapBackendCArmToScene(state.cArm as Partial<import('./store/mappers').BackendCArmState>);
      set((prev) => ({
        cArm: { ...prev.cArm, ...sceneCArm },
        cArmHeightJoint: sceneCArm.cArmHeightJoint ?? prev.cArmHeightJoint,
        cArmRotation: sceneCArm.cArmRotation ?? prev.cArmRotation,
        cArmFrontBackRotation: sceneCArm.cArmFrontBackRotation ?? prev.cArmFrontBackRotation,
        frontBackTranslation: sceneCArm.frontBackTranslation ?? prev.frontBackTranslation,
        lastUpdateSource: 'backend',
        cArmInteractionState: 'IDLE',
        cArmInteractingPart: null,
      }));
      return true;
    }

    return false;
  },

  refreshDevicePositionsFromBackend: async () => {
    const bedDeviceId = get().selectedBedDeviceId;
    const cArmDeviceId = get().selectedCArmDeviceId;

    if (bedDeviceId) {
      await get().loadBedPositionFromBackend(bedDeviceId);
    }

    if (cArmDeviceId) {
      const response = await fetchDeviceState(cArmDeviceId);
      if (response) {
        const sceneCArm = mapBackendCArmToScene(response.jointPositions as Partial<import('./store/mappers').BackendCArmState>);
        set((prev) => ({
          cArm: { ...prev.cArm, ...sceneCArm },
          cArmHeightJoint: sceneCArm.cArmHeightJoint ?? prev.cArmHeightJoint,
          cArmRotation: sceneCArm.cArmRotation ?? prev.cArmRotation,
          cArmFrontBackRotation: sceneCArm.cArmFrontBackRotation ?? prev.cArmFrontBackRotation,
          frontBackTranslation: sceneCArm.frontBackTranslation ?? prev.frontBackTranslation,
          lastUpdateSource: 'backend',
        }));
      }
    }
  },

  loadBedPositionFromBackend: async (deviceId) => {
    const targetDeviceId = deviceId ?? get().selectedBedDeviceId;
    if (!targetDeviceId) return;

    const response = await fetchDeviceState(targetDeviceId);
    if (response) {
      const sceneBed = mapBackendBedToScene(response.jointPositions as Partial<import('./store/mappers').BackendBedState>);
      set((prev) => ({
        bed: { ...prev.bed, ...sceneBed },
        lastUpdateSource: 'backend',
      }));
    }
  },

  setLastBackendTimestamp: (timestamp) => set({ lastBackendTimestamp: timestamp }),

  syncToBackend: async () => {
    const bedDeviceId = get().selectedBedDeviceId;
    const cArmDeviceId = get().selectedCArmDeviceId;
    const timestamp = Date.now();

    if (bedDeviceId) {
      const backendBed = mapSceneBedToBackend(get().bed);
      await syncDeviceState({
        device: 'surgical_bed',
        timestamp,
        state: backendBed as Record<string, unknown>,
      });
    }

    if (cArmDeviceId) {
      const backendCArm = mapSceneCArmToBackend(get().cArm);
      await syncDeviceState({
        device: 'c_arm',
        timestamp,
        state: backendCArm as Record<string, unknown>,
      });
    }
  },

  initializeBackendSync: () => {
    void get().loadSpaceDevices().then(() => {
      startBackendPolling(() => get().loadFromBackend());
    });
  },

  cleanupBackendSync: () => {
    stopBackendPolling();
  },

  loadFromBackend: async (options) => {
    const silent = options?.silent ?? false;
    const response = await fetchFullSpaceData();

    if (!response) {
      if (!silent) get().pushToast('后端不可达', 'error');
      set({ backendConnectionStatus: 'disconnected' });
      return;
    }

    set({
      backendConnectionStatus: 'connected',
      backendGlobalError: response.globalError,
      backendDeviceErrors: response.deviceErrors,
    });

    const { selectedBedDeviceId, selectedCArmDeviceId, spaceDevices } = get();
    const cArmBound = resolveCArmBinding(spaceDevices, selectedCArmDeviceId);

    const deviceKeys = Object.keys(response.devices);
    const resolveBedId = (): string | null => {
      if (selectedBedDeviceId && response.devices[selectedBedDeviceId]) return selectedBedDeviceId;
      for (const key of deviceKeys) {
        if (/bed|table|surgical|surgery/i.test(key)) return key;
      }
      return null;
    };
    const resolveCArmId = (): string | null => {
      const bound = cArmBound?.id;
      if (bound && response.devices[bound]) return bound;
      if (selectedCArmDeviceId && response.devices[selectedCArmDeviceId]) return selectedCArmDeviceId;
      for (const key of deviceKeys) {
        if (/c[-_]?arm/i.test(key)) return key;
      }
      return null;
    };

    const bedId = resolveBedId();
    const cArmId = resolveCArmId();

    if (bedId && !get().selectedBedDeviceId) {
      set({ selectedBedDeviceId: bedId });
    }
    if (cArmId && !get().selectedCArmDeviceId) {
      set({ selectedCArmDeviceId: cArmId });
    }

    const isBedUserInteracting = get().bedInteractionState === 'USER_INTERACTING';
    const isCArmUserInteracting = get().cArmInteractionState === 'USER_INTERACTING';

    if (bedId) {
      const bedData = response.devices[bedId];
      if (bedData) {
        const rawJoints = (bedData.jointPositions ?? {}) as Record<string, number>;
        set({
          bedRawJoints: rawJoints,
          bedStateName: bedData.stateName ?? '',
          bedStateProgress: bedData.stateProgress ?? 0,
        });
        const sceneBed = mapBackendBedToScene(bedData.jointPositions as Partial<import('./store/mappers').BackendBedState>, get().bed);
        if (Object.keys(sceneBed).length > 0) {
          set((prev) => ({
            bed: { ...prev.bed, ...sceneBed },
            lastUpdateSource: 'backend',
            bedInteractionState: !isBedUserInteracting && prev.bedInteractionState === 'AWAITING_BACKEND_UPDATE' ? 'IDLE' : prev.bedInteractionState,
            bedInteractingPart: !isBedUserInteracting && prev.bedInteractionState === 'AWAITING_BACKEND_UPDATE' ? null : prev.bedInteractingPart,
          }));
        }
      }
    }

    if (cArmId) {
      const cArmData = response.devices[cArmId];
      if (cArmData) {
        const rawJoints = (cArmData.jointPositions ?? {}) as Record<string, number>;
        set({ cArmRawJoints: rawJoints });
        const sceneCArm = mapBackendCArmToScene(cArmData.jointPositions as Partial<import('./store/mappers').BackendCArmState>, get().cArm);
        set((prev) => ({
          cArm: { ...prev.cArm, ...sceneCArm },
          cArmHeightJoint: sceneCArm.cArmHeightJoint ?? prev.cArmHeightJoint,
          cArmRotation: sceneCArm.cArmRotation ?? prev.cArmRotation,
          cArmFrontBackRotation: sceneCArm.cArmFrontBackRotation ?? prev.cArmFrontBackRotation,
          frontBackTranslation: sceneCArm.frontBackTranslation ?? prev.frontBackTranslation,
          lastUpdateSource: 'backend',
          cArmInteractionState: !isCArmUserInteracting && prev.cArmInteractionState === 'AWAITING_BACKEND_UPDATE' ? 'IDLE' : prev.cArmInteractionState,
          cArmInteractingPart: !isCArmUserInteracting && prev.cArmInteractionState === 'AWAITING_BACKEND_UPDATE' ? null : prev.cArmInteractingPart,
        }));
      }
    }
  },

  sendEmergencyStop: async () => {
    set({ emergencyStopping: true });
    try {
      await apiSendEmergencyStop();
      get().pushToast('已发送紧急停止命令', 'warning');
    } finally {
      set({ emergencyStopping: false });
    }
  },
}));
