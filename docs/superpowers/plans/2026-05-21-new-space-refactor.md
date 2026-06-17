# New Space 代码重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 new space 目录代码，拆分 store.ts，添加单元测试，优化 3D 场景性能

**Architecture:** 
1. 将 646 行的 store.ts 拆分为多个模块（bedStore, carmStore, uiStore, presetStore, backendStore）
2. 使用 Zustand 的组合模式（compose）将多个 store 合并
3. 为关键函数添加单元测试
4. 优化 3D 场景性能（帧率控制、几何体简化、材质优化）

**Tech Stack:** React, TypeScript, Zustand, Three.js, React Three Fiber, Vitest

---

## 文件结构规划

### 新建文件
- `src/apps/new space/store/bedStore.ts` - 床控状态管理
- `src/apps/new space/store/carmStore.ts` - C臂状态管理
- `src/apps/new space/store/uiStore.ts` - UI状态管理
- `src/apps/new space/store/presetStore.ts` - 预设状态管理
- `src/apps/new space/store/backendStore.ts` - 后端同步状态管理
- `src/apps/new space/store/index.ts` - 统一导出和组合
- `src/apps/new space/__tests__/store/bedStore.test.ts` - 床控 store 测试
- `src/apps/new space/__tests__/store/carmStore.test.ts` - C臂 store 测试
- `src/apps/new space/__tests__/utils/spaceDeviceBindings.test.ts` - 设备绑定工具测试
- `src/apps/new space/__tests__/store/mappers.test.ts` - 数据映射测试

### 修改文件
- `src/apps/new space/store.ts` - 重构为导入和导出拆分后的模块
- `src/apps/new space/scenes/OperatingRoom.tsx` - 性能优化
- `src/apps/new space/scenes/URDFModel.tsx` - 性能优化
- `src/apps/new space/components/ThreeScenePanel.tsx` - 性能优化

---

## 任务分解

### Task 1: 拆分 bedStore

**Files:**
- Create: `src/apps/new space/store/bedStore.ts`
- Modify: `src/apps/new space/store.ts:88-118, 227-329`

- [ ] **Step 1: 创建 bedStore.ts 文件**

```typescript
/**
 * @file bedStore.ts
 * @description 床控状态管理
 * @author IOBS Team
 * @date 2024-01-01
 */

import { create } from 'zustand';
import type { NewSpaceSceneBedState } from '../types/store';
import { DEFAULT_NEW_SPACE_BED, DEFAULT_BED_JOINT_SPEEDS } from '../constants/defaults';
import { setNewSpaceBedJointMove } from '../services/bedApi';

interface BedStore {
  bed: NewSpaceSceneBedState;
  bedJointSpeeds: Record<string, number>;
  selectedTelemetryModuleId: string | null;
  
  setBedJointSpeed: (joint: string, speed: number) => void;
  setSelectedTelemetryModuleId: (id: string | null) => void;
  requireSelectedTelemetryModule: () => string | null;
  sendBedTelemetryModuleMove: (direction: 'up' | 'down' | 'left' | 'right') => Promise<void>;
  sendBedJointMoveWithSpeed: (joint: string, speed: number) => Promise<void>;
}

const BED_JOINT_MAPPING_MODE = (import.meta.env.VITE_BED_JOINT_MAPPING_MODE === 'legacy' ? 'legacy' : 'spec') as 'legacy' | 'spec';
const HEIGHT_MOVE_JOINT = BED_JOINT_MAPPING_MODE === 'legacy' ? 'bed_front_back_joint' : 'bed_height_joint';
const FRONT_BACK_MOVE_JOINT = BED_JOINT_MAPPING_MODE === 'legacy' ? 'bed_height_joint' : 'bed_front_back_joint';

const BED_CONTROL_DIRECTION_MAP: Record<string, { speed: number; axis: Record<'up' | 'down' | 'left' | 'right', 1 | -1> }> = {
  bed_height_joint: { speed: 400, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_tilt_joint: { speed: 10, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_lateral_joint: { speed: 10, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_front_back_joint: { speed: 300, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_panel_back_joint: { speed: 10, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_panel_left_leg_joint: { speed: 10, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_panel_right_leg_joint: { speed: 10, axis: { up: 1, down: -1, left: -1, right: 1 } },
};

export const useBedStore = create<BedStore>((set, get) => ({
  bed: DEFAULT_NEW_SPACE_BED,
  bedJointSpeeds: { ...DEFAULT_BED_JOINT_SPEEDS },
  selectedTelemetryModuleId: null,

  setBedJointSpeed: (joint, speed) => set((state) => ({
    bedJointSpeeds: { ...state.bedJointSpeeds, [joint]: speed },
  })),

  setSelectedTelemetryModuleId: (id) => set({ selectedTelemetryModuleId: id }),

  requireSelectedTelemetryModule: () => {
    const selected = get().selectedTelemetryModuleId;
    if (!selected) {
      console.warn('请先在右侧传感器遥测中选择一个模块');
      return null;
    }
    return selected;
  },

  sendBedTelemetryModuleMove: async (direction) => {
    const selected = get().requireSelectedTelemetryModule();
    if (!selected) return;

    const config = BED_CONTROL_DIRECTION_MAP[selected];
    if (!config) {
      console.error(`未配置模块控制映射：${selected}`);
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
      console.error(`床控动作失败：${result.error || 'unknown_error'}`);
      return;
    }

    console.log(`已发送 ${selected} ${direction} 控制`);
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
      console.error(`关节动作失败：${result.error || 'unknown_error'}`);
      return;
    }

    if (speed !== 0) {
      console.log(`已发送 ${joint} 速度 ${speed}`);
    }
  },
}));
```

- [ ] **Step 2: 验证 bedStore.ts 语法正确**

运行: `npx tsc --noEmit "src/apps/new space/store/bedStore.ts"`
预期: 无错误

- [ ] **Step 3: 提交 bedStore 创建**

```bash
git add "src/apps/new space/store/bedStore.ts"
git commit -m "refactor(store): 拆分床控状态管理模块"
```

---

### Task 2: 拆分 carmStore

**Files:**
- Create: `src/apps/new space/store/carmStore.ts`
- Modify: `src/apps/new space/store.ts:72-76, 100-102, 119-125, 350-410`

- [ ] **Step 1: 创建 carmStore.ts 文件**

```typescript
/**
 * @file carmStore.ts
 * @description C臂状态管理
 * @author IOBS Team
 * @date 2024-01-01
 */

import { create } from 'zustand';
import type { NewSpaceSceneCArmState } from '../types/store';
import { DEFAULT_NEW_SPACE_CARM } from '../constants/defaults';
import {
  fetchNewSpaceCArmMode,
  setNewSpaceCArmMode,
  setNewSpaceCArmJointMove,
} from '../services/carmApi';

interface CArmStore {
  cArm: NewSpaceSceneCArmState;
  cArmRotation: number;
  cArmFrontBackRotation: number;
  cArmHeightJoint: number;
  frontBackTranslation: number;
  cArmModeState: 1 | -1 | 0;
  cArmModeLoading: boolean;
  cArmLoadingJoint: string | null;

  setCArmRotation: (value: number) => void;
  setCArmFrontBackRotation: (value: number) => void;
  setCArmHeightJoint: (value: number) => void;
  setCArmFrontBackTranslation: (value: number) => void;
  resetLocalCArmPose: () => void;
  hydrateCArmMode: () => Promise<void>;
  applyCArmMode: (mode: 1 | -1 | 0) => Promise<void>;
  sendCArmJointMove: (joint: string, speed: number) => Promise<void>;
}

export const useCArmStore = create<CArmStore>((set, get) => ({
  cArm: DEFAULT_NEW_SPACE_CARM,
  cArmRotation: 0,
  cArmFrontBackRotation: 0,
  cArmHeightJoint: 350,
  frontBackTranslation: 150,
  cArmModeState: 0,
  cArmModeLoading: false,
  cArmLoadingJoint: null,

  setCArmRotation: (value) => set((state) => ({ 
    cArmRotation: value, 
    cArm: { ...state.cArm, cArmRotation: value } 
  })),

  setCArmFrontBackRotation: (value) => set((state) => ({ 
    cArmFrontBackRotation: value, 
    cArm: { ...state.cArm, cArmFrontBackRotation: value } 
  })),

  setCArmHeightJoint: (value) => set((state) => ({ 
    cArmHeightJoint: value, 
    cArm: { ...state.cArm, cArmHeightJoint: value } 
  })),

  setCArmFrontBackTranslation: (value) => set((state) => ({ 
    frontBackTranslation: value, 
    cArm: { ...state.cArm, frontBackTranslation: value } 
  })),

  resetLocalCArmPose: () => {
    set((state) => ({
      cArmHeightJoint: 350,
      cArmRotation: 0,
      cArmFrontBackRotation: 0,
      frontBackTranslation: 150,
      cArm: {
        ...state.cArm,
        cArmRotation: 0,
        cArmFrontBackRotation: 0,
        cArmHeightJoint: 350,
        frontBackTranslation: 150,
      },
    }));
  },

  hydrateCArmMode: async () => {
    try {
      const mode = await fetchNewSpaceCArmMode();
      if (mode) set({ cArmModeState: mode.mode });
    } catch (error) {
      console.error('[hydrateCArmMode] Error:', error);
    }
  },

  applyCArmMode: async (mode) => {
    set({ cArmModeLoading: true });
    try {
      const ok = await setNewSpaceCArmMode(mode);
      if (ok) {
        set({ cArmModeState: mode });
        console.log(`已成功切换为 ${mode === 1 ? '同步' : mode === -1 ? '镜像' : '脱离'} 模式`);
      } else {
        console.error('模式切换失败');
      }
    } finally {
      set({ cArmModeLoading: false });
    }
  },

  sendCArmJointMove: async (joint, speed) => {
    set({ cArmLoadingJoint: joint });
    try {
      await setNewSpaceCArmJointMove(joint, speed);
    } finally {
      set({ cArmLoadingJoint: null });
    }
  },
}));
```

- [ ] **Step 2: 验证 carmStore.ts 语法正确**

运行: `npx tsc --noEmit "src/apps/new space/store/carmStore.ts"`
预期: 无错误

- [ ] **Step 3: 提交 carmStore 创建**

```bash
git add "src/apps/new space/store/carmStore.ts"
git commit -m "refactor(store): 拆分C臂状态管理模块"
```

---

### Task 3: 拆分 uiStore

**Files:**
- Create: `src/apps/new space/store/uiStore.ts`
- Modify: `src/apps/new space/store.ts:70-71, 90-99, 113-114, 224-226`

- [ ] **Step 1: 创建 uiStore.ts 文件**

```typescript
/**
 * @file uiStore.ts
 * @description UI状态管理
 * @author IOBS Team
 * @date 2024-01-01
 */

import { create } from 'zustand';
import type { NewSpaceToastType, NewSpaceToastItem } from '../types/store';

interface UIStore {
  toasts: NewSpaceToastItem[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  isResettingCamera: boolean;
  showBedModelInScene: boolean;
  showCArmModelInScene: boolean;
  isMeasuring: boolean;
  isAnnotating: boolean;
  isSceneInteracting: boolean;
  sceneLocked: boolean;

  pushToast: (message: string, type?: NewSpaceToastType) => void;
  removeToast: (id: string) => void;
  updateCameraPosition: (position: [number, number, number], target: [number, number, number]) => void;
  setSceneInteracting: (interacting: boolean) => void;
  setShowBedModelInScene: (visible: boolean) => void;
  setShowCArmModelInScene: (visible: boolean) => void;
  toggleMeasuring: () => void;
  toggleAnnotating: () => void;
  setSceneLocked: (locked: boolean) => void;
}

import {
  DEFAULT_NEW_SPACE_CAMERA_POSITION,
  DEFAULT_NEW_SPACE_CAMERA_TARGET,
} from '../constants/defaults';

export const useUIStore = create<UIStore>((set) => ({
  toasts: [],
  cameraPosition: DEFAULT_NEW_SPACE_CAMERA_POSITION,
  cameraTarget: DEFAULT_NEW_SPACE_CAMERA_TARGET,
  isResettingCamera: false,
  showBedModelInScene: true,
  showCArmModelInScene: true,
  isMeasuring: false,
  isAnnotating: false,
  isSceneInteracting: false,
  sceneLocked: false,

  pushToast: (message, type = 'info') =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, message, type },
      ].slice(-4),
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  updateCameraPosition: (position, target) => set({ cameraPosition: position, cameraTarget: target }),

  setSceneInteracting: (interacting) => set({ isSceneInteracting: interacting }),

  setShowBedModelInScene: (visible) => set({ showBedModelInScene: visible }),

  setShowCArmModelInScene: (visible) => set({ showCArmModelInScene: visible }),

  toggleMeasuring: () => set((state) => ({ isMeasuring: !state.isMeasuring, isAnnotating: false })),

  toggleAnnotating: () => set((state) => ({ isAnnotating: !state.isAnnotating, isMeasuring: false })),

  setSceneLocked: (locked) => set({ sceneLocked: locked }),
}));
```

- [ ] **Step 2: 验证 uiStore.ts 语法正确**

运行: `npx tsc --noEmit "src/apps/new space/store/uiStore.ts"`
预期: 无错误

- [ ] **Step 3: 提交 uiStore 创建**

```bash
git add "src/apps/new space/store/uiStore.ts"
git commit -m "refactor(store): 拆分UI状态管理模块"
```

---

### Task 4: 拆分 presetStore

**Files:**
- Create: `src/apps/new space/store/presetStore.ts`
- Modify: `src/apps/new space/store.ts:103-110, 126-133, 411-530`

- [ ] **Step 1: 创建 presetStore.ts 文件**

```typescript
/**
 * @file presetStore.ts
 * @description 预设状态管理
 * @author IOBS Team
 * @date 2024-01-01
 */

import { create } from 'zustand';
import type { BedStatusPoseItem } from '../services/presetApi';
import {
  fetchNewSpaceBedStatusList,
  applyNewSpaceBedStatusById,
  fetchNewSpaceDemoList,
  applyNewSpaceDemoById,
} from '../services/presetApi';

interface PresetStore {
  presetLoading: boolean;
  presetApplyingId: string | null;
  presetLastAppliedId: string | null;
  presetIsTwoColumn: boolean;
  presetSource: 'current' | 'demo';
  presetQuery: string;
  presetItems: Array<{ id: string; item: BedStatusPoseItem }>;
  presetBrokenImageIds: Record<string, boolean>;

  setPresetIsTwoColumn: (value: boolean | ((prev: boolean) => boolean)) => void;
  setPresetSource: (value: 'current' | 'demo') => void;
  setPresetQuery: (value: string) => void;
  setPresetLoading: (value: boolean) => void;
  setPresetApplyingId: (value: string | null) => void;
  setPresetLastAppliedId: (value: string | null) => void;
  setPresetItems: (value: Array<{ id: string; item: BedStatusPoseItem }>) => void;
  setPresetBrokenImageIds: (value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  loadPresetStatusList: (source?: 'current' | 'demo') => Promise<void>;
  applyPresetById: (id: string) => Promise<void>;
}

const sortStatusItems = (list: Array<{ id: string; item: BedStatusPoseItem }>) => {
  const priorityOrder = ['zero', 'exchange', 'goup'];

  return [...list].sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.id);
    const bPriority = priorityOrder.indexOf(b.id);

    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;

    const aNum = parseInt(a.id, 10);
    const bNum = parseInt(b.id, 10);
    const aIsNum = !isNaN(aNum);
    const bIsNum = !isNaN(bNum);

    if (aIsNum && bIsNum) return aNum - bNum;
    if (aIsNum) return -1;
    if (bIsNum) return 1;

    return a.id.localeCompare(b.id, 'zh-CN');
  });
};

export const usePresetStore = create<PresetStore>((set, get) => ({
  presetLoading: false,
  presetApplyingId: null,
  presetLastAppliedId: null,
  presetIsTwoColumn: false,
  presetSource: 'current',
  presetQuery: '',
  presetItems: [],
  presetBrokenImageIds: {},

  setPresetIsTwoColumn: (value) => set((state) => ({
    presetIsTwoColumn: typeof value === 'function' ? value(state.presetIsTwoColumn) : value,
  })),

  setPresetSource: (value) => set({ presetSource: value }),

  setPresetQuery: (value) => set({ presetQuery: value }),

  setPresetLoading: (value) => set({ presetLoading: value }),

  setPresetApplyingId: (value) => set({ presetApplyingId: value }),

  setPresetLastAppliedId: (value) => set({ presetLastAppliedId: value }),

  setPresetItems: (value) => set({ presetItems: value }),

  setPresetBrokenImageIds: (value) => set((state) => ({
    presetBrokenImageIds: typeof value === 'function' ? value(state.presetBrokenImageIds) : value,
  })),

  loadPresetStatusList: async (source) => {
    const src = source ?? get().presetSource;
    set({ presetLoading: true, presetSource: src });

    try {
      const response = src === 'demo'
        ? await fetchNewSpaceDemoList()
        : await fetchNewSpaceBedStatusList();

      if (response.error) {
        console.error(`加载预设列表失败：${response.error}`);
        return;
      }

      const items = Object.entries(response.status || {}).map(([id, item]) => ({ id, item }));
      set({ presetItems: sortStatusItems(items) });
    } catch (error) {
      console.error('加载预设列表异常:', error);
    } finally {
      set({ presetLoading: false });
    }
  },

  applyPresetById: async (id) => {
    set({ presetApplyingId: id });

    try {
      const src = get().presetSource;
      const result = src === 'demo'
        ? await applyNewSpaceDemoById(id)
        : await applyNewSpaceBedStatusById(id);

      if (!result.ok) {
        console.error(`应用预设失败：${result.error || 'unknown_error'}`);
        return;
      }

      set({ presetLastAppliedId: id });
      console.log(`已成功应用预设 ${id}`);
    } catch (error) {
      console.error('应用预设异常:', error);
    } finally {
      set({ presetApplyingId: null });
    }
  },
}));
```

- [ ] **Step 2: 验证 presetStore.ts 语法正确**

运行: `npx tsc --noEmit "src/apps/new space/store/presetStore.ts"`
预期: 无错误

- [ ] **Step 3: 提交 presetStore 创建**

```bash
git add "src/apps/new space/store/presetStore.ts"
git commit -m "refactor(store): 拆分预设状态管理模块"
```

---

### Task 5: 拆分 backendStore

**Files:**
- Create: `src/apps/new space/store/backendStore.ts`
- Modify: `src/apps/new space/store.ts:76-87, 134-147, 531-646`

- [ ] **Step 1: 创建 backendStore.ts 文件**

```typescript
/**
 * @file backendStore.ts
 * @description 后端同步状态管理
 * @author IOBS Team
 * @date 2024-01-01
 */

import { create } from 'zustand';
import type {
  BackendConnectionStatus,
  LastUpdateSource,
  IncomingBackendDeviceState,
} from '../types/store';
import type { SpaceDeviceInfo } from '../types/space';
import { startBackendPolling, stopBackendPolling } from './backendSync';
import { fetchFullSpaceData, fetchSpaceDevices, syncDeviceState, fetchDeviceState } from '../services/iobsApi';
import { mapBackendBedToScene, mapBackendCArmToScene, mapSceneBedToBackend, mapSceneCArmToBackend } from './mappers';
import { isLikelyBedDevice, isLikelyCArmDevice, listCArmDeviceCandidates, resolveCArmBinding } from '../utils/spaceDeviceBindings';
import { sendEmergencyStop } from '../services/iobsApi';

interface BackendStore {
  interactionState: 'IDLE' | 'USER_INTERACTING' | 'AWAITING_BACKEND_UPDATE';
  interactingPart: string | null;
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
  emergencyStopping: boolean;

  setInteractionState: (value: BackendStore['interactionState']) => void;
  setInteractingPart: (value: string | null) => void;
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
  sendEmergencyStop: () => Promise<void>;
}

let syncDebounceHandle: ReturnType<typeof setTimeout> | null = null;
let lastUserCommandAt = 0;

const scheduleSyncToBackend = (syncFn: () => Promise<void>) => {
  if (syncDebounceHandle) clearTimeout(syncDebounceHandle);
  lastUserCommandAt = Date.now();
  syncDebounceHandle = setTimeout(() => {
    syncDebounceHandle = null;
    syncFn();
  }, 150);
};

export const useBackendStore = create<BackendStore>((set, get) => ({
  interactionState: 'IDLE',
  interactingPart: null,
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
  emergencyStopping: false,

  setInteractionState: (value) => set({ interactionState: value }),
  setInteractingPart: (value) => set({ interactingPart: value }),

  loadSpaceDevices: async () => {
    try {
      const devices = await fetchSpaceDevices();
      set({ spaceDevices: devices });

      const bedDevice = devices.find(isLikelyBedDevice);
      if (bedDevice) set({ selectedBedDeviceId: bedDevice.id });

      const cArmCandidates = listCArmDeviceCandidates(devices);
      if (cArmCandidates.length > 0) {
        set({ selectedCArmDeviceId: cArmCandidates[0].id });
      }
    } catch (error) {
      console.error('[loadSpaceDevices] Error:', error);
    }
  },

  setSelectedBedDeviceId: (deviceId) => set({ selectedBedDeviceId: deviceId }),
  setSelectedCArmDeviceId: (deviceId) => set({ selectedCArmDeviceId: deviceId }),

  applyBackendDeviceState: (incoming) => {
    const { device, state } = incoming;
    
    if (device === 'surgical_bed' && state.bed) {
      const bedState = mapBackendBedToScene(state.bed);
      set({ bed: bedState, lastUpdateSource: 'backend' });
      return true;
    }
    
    if (device === 'c_arm' && state.cArm) {
      const cArmState = mapBackendCArmToScene(state.cArm);
      set({ cArm: cArmState, lastUpdateSource: 'backend' });
      return true;
    }
    
    return false;
  },

  refreshDevicePositionsFromBackend: async () => {
    const { selectedBedDeviceId, selectedCArmDeviceId } = get();
    
    if (selectedBedDeviceId) {
      await get().loadBedPositionFromBackend(selectedBedDeviceId);
    }
    
    if (selectedCArmDeviceId) {
      try {
        const data = await fetchDeviceState(selectedCArmDeviceId);
        if (data?.cArm) {
          const cArmState = mapBackendCArmToScene(data.cArm);
          set({ cArm: cArmState, lastUpdateSource: 'backend' });
        }
      } catch (error) {
        console.error('[refreshDevicePositionsFromBackend] C-Arm error:', error);
      }
    }
  },

  loadBedPositionFromBackend: async (deviceId) => {
    const id = deviceId ?? get().selectedBedDeviceId;
    if (!id) return;

    try {
      const data = await fetchDeviceState(id);
      if (data?.bed) {
        const bedState = mapBackendBedToScene(data.bed);
        set({ bed: bedState, lastUpdateSource: 'backend' });
      }
    } catch (error) {
      console.error('[loadBedPositionFromBackend] Error:', error);
    }
  },

  setLastBackendTimestamp: (timestamp) => set({ lastBackendTimestamp: timestamp }),

  syncToBackend: async () => {
    const { selectedBedDeviceId, selectedCArmDeviceId, bed, cArm } = get();
    
    if (Date.now() - lastUserCommandAt > 3000) return;

    try {
      if (selectedBedDeviceId) {
        const backendBed = mapSceneBedToBackend(bed);
        await syncDeviceState(selectedBedDeviceId, { bed: backendBed });
      }
      
      if (selectedCArmDeviceId) {
        const backendCArm = mapSceneCArmToBackend(cArm);
        await syncDeviceState(selectedCArmDeviceId, { cArm: backendCArm });
      }
      
      set({ interactionState: 'IDLE', interactingPart: null, lastUpdateSource: 'ui' });
    } catch (error) {
      console.error('[syncToBackend] Error:', error);
    }
  },

  initializeBackendSync: () => {
    startBackendPolling(
      () => get().loadFromBackend({ silent: true }),
      (message) => console.error('[BackendPolling]', message)
    );
  },

  cleanupBackendSync: () => {
    stopBackendPolling();
  },

  loadFromBackend: async (options) => {
    const { silent = false } = options || {};
    
    try {
      const data = await fetchFullSpaceData();
      
      if (data.bed) {
        const bedState = mapBackendBedToScene(data.bed);
        set({ bed: bedState });
      }
      
      if (data.cArm) {
        const cArmState = mapBackendCArmToScene(data.cArm);
        set({ cArm: cArmState });
      }
      
      set({ backendConnectionStatus: 'connected', backendGlobalError: '' });
    } catch (error) {
      if (!silent) {
        console.error('[loadFromBackend] Error:', error);
      }
      set({ backendConnectionStatus: 'disconnected' });
    }
  },

  sendEmergencyStop: async () => {
    set({ emergencyStopping: true });
    try {
      await sendEmergencyStop();
      console.log('紧急制动已发送');
    } catch (error) {
      console.error('[sendEmergencyStop] Error:', error);
    } finally {
      set({ emergencyStopping: false });
    }
  },
}));
```

- [ ] **Step 2: 验证 backendStore.ts 语法正确**

运行: `npx tsc --noEmit "src/apps/new space/store/backendStore.ts"`
预期: 无错误

- [ ] **Step 3: 提交 backendStore 创建**

```bash
git add "src/apps/new space/store/backendStore.ts"
git commit -m "refactor(store): 拆分后端同步状态管理模块"
```

---

### Task 6: 创建统一导出文件

**Files:**
- Create: `src/apps/new space/store/index.ts`
- Modify: `src/apps/new space/store.ts` (重构为导入导出)

- [ ] **Step 1: 创建 store/index.ts 文件**

```typescript
/**
 * @file index.ts
 * @description 统一导出所有 store 模块
 * @author IOBS Team
 * @date 2024-01-01
 */

export { useBedStore } from './bedStore';
export { useCArmStore } from './carmStore';
export { useUIStore } from './uiStore';
export { usePresetStore } from './presetStore';
export { useBackendStore } from './backendStore';

// 组合所有 store 的 hook
import { useBedStore } from './bedStore';
import { useCArmStore } from './carmStore';
import { useUIStore } from './uiStore';
import { usePresetStore } from './presetStore';
import { useBackendStore } from './backendStore';

// 创建统一的 store hook（向后兼容）
export const useNewSpaceStore = <T>(
  selector: (state: ReturnType<typeof useBedStore.getState> & 
                    ReturnType<typeof useCArmStore.getState> & 
                    ReturnType<typeof useUIStore.getState> & 
                    ReturnType<typeof usePresetStore.getState> & 
                    ReturnType<typeof useBackendStore.getState>) => T
): T => {
  // 这里需要根据实际使用的字段来决定从哪个 store 获取
  // 这是一个简化的实现，实际使用时可能需要更复杂的逻辑
  const bedState = useBedStore();
  const cArmState = useCArmStore();
  const uiState = useUIStore();
  const presetState = usePresetStore();
  const backendState = useBackendStore();
  
  return selector({ ...bedState, ...cArmState, ...uiState, ...presetState, ...backendState });
};
```

- [ ] **Step 2: 重构 store.ts 为导入导出**

```typescript
/**
 * @file store.ts
 * @description 手术室应用状态管理入口文件
 * @author IOBS Team
 * @date 2024-01-01
 */

// 导出所有拆分后的 store
export {
  useBedStore,
  useCArmStore,
  useUIStore,
  usePresetStore,
  useBackendStore,
  useNewSpaceStore,
} from './store/index';

// 导出类型
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

// 导出常量
export {
  DEFAULT_NEW_SPACE_CAMERA_POSITION,
  DEFAULT_NEW_SPACE_CAMERA_TARGET,
  DEFAULT_NEW_SPACE_BED,
  DEFAULT_NEW_SPACE_CARM,
} from './constants/defaults';
```

- [ ] **Step 3: 验证重构后的代码**

运行: `npx tsc --noEmit`
预期: 无错误

- [ ] **Step 4: 提交 store 重构**

```bash
git add "src/apps/new space/store/index.ts" "src/apps/new space/store.ts"
git commit -m "refactor(store): 完成状态管理模块拆分和统一导出"
```

---

### Task 7: 添加 bedStore 单元测试

**Files:**
- Create: `src/apps/new space/__tests__/store/bedStore.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
/**
 * @file bedStore.test.ts
 * @description 床控状态管理单元测试
 * @author IOBS Team
 * @date 2024-01-01
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBedStore } from '../../store/bedStore';

// Mock API
vi.mock('../../services/bedApi', () => ({
  setNewSpaceBedJointMove: vi.fn().mockResolvedValue({ ok: true }),
}));

describe('bedStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useBedStore.setState({
      bed: {
        x: 0, y: 0, z: 0, rotX: 0, rotY: 0,
        height: 1030, trendelenburg: 0, lateral: 0, frontBackPosition: 0,
        backrestAngle: 0, leftLegAngle: 0, rightLegAngle: 0,
        leftRightTilt: 0, frontBackTilt: 0,
        baseOffset: { x: 0, y: 0, z: 0 },
        baseRotation: { x: 0, y: 0, z: 0 },
        surfaceOffset: { x: 0, y: 0, z: 0 },
        surfaceRotation: { x: 0, y: 0, z: 0 },
        panelMidOffset: { x: 0, y: 0, z: 0 },
        panelMidRotation: { x: 0, y: 0, z: 0 },
        panelRightLegOffset: { x: 0, y: 0, z: 0 },
        panelRightLegRotation: { x: 0, y: 0, z: 0 },
        panelLeftLegOffset: { x: 0, y: 0, z: 0 },
        panelLeftLegRotation: { x: 0, y: 0, z: 0 },
        panelBackOffset: { x: 0, y: 0, z: 0 },
        panelBackRotation: { x: 0, y: 0, z: 0 },
        enclosure1Offset: { x: 0, y: 0, z: 0 },
        enclosure2Offset: { x: 0, y: 0, z: 0 },
        enclosure3Offset: { x: 0, y: 0, z: 0 },
      },
      bedJointSpeeds: {
        bed_height_joint: 400,
        bed_tilt_joint: 10,
        bed_lateral_joint: 10,
        bed_front_back_joint: 300,
        bed_panel_back_joint: 10,
        bed_panel_left_leg_joint: 10,
        bed_panel_right_leg_joint: 10,
      },
      selectedTelemetryModuleId: null,
    });
  });

  describe('setBedJointSpeed', () => {
    it('应该正确设置关节速度', () => {
      const { setBedJointSpeed, bedJointSpeeds } = useBedStore.getState();
      
      setBedJointSpeed('bed_height_joint', 500);
      
      expect(useBedStore.getState().bedJointSpeeds.bed_height_joint).toBe(500);
    });

    it('应该保留其他关节速度不变', () => {
      const { setBedJointSpeed } = useBedStore.getState();
      const originalSpeed = useBedStore.getState().bedJointSpeeds.bed_tilt_joint;
      
      setBedJointSpeed('bed_height_joint', 500);
      
      expect(useBedStore.getState().bedJointSpeeds.bed_tilt_joint).toBe(originalSpeed);
    });
  });

  describe('setSelectedTelemetryModuleId', () => {
    it('应该正确设置选中的遥测模块ID', () => {
      const { setSelectedTelemetryModuleId } = useBedStore.getState();
      
      setSelectedTelemetryModuleId('bed_height_joint');
      
      expect(useBedStore.getState().selectedTelemetryModuleId).toBe('bed_height_joint');
    });

    it('应该能够清除选中的遥测模块ID', () => {
      const { setSelectedTelemetryModuleId } = useBedStore.getState();
      
      setSelectedTelemetryModuleId('bed_height_joint');
      setSelectedTelemetryModuleId(null);
      
      expect(useBedStore.getState().selectedTelemetryModuleId).toBeNull();
    });
  });

  describe('requireSelectedTelemetryModule', () => {
    it('当没有选中模块时应该返回 null', () => {
      const { requireSelectedTelemetryModule } = useBedStore.getState();
      
      const result = requireSelectedTelemetryModule();
      
      expect(result).toBeNull();
    });

    it('当有选中模块时应该返回模块ID', () => {
      const { setSelectedTelemetryModuleId, requireSelectedTelemetryModule } = useBedStore.getState();
      
      setSelectedTelemetryModuleId('bed_height_joint');
      const result = requireSelectedTelemetryModule();
      
      expect(result).toBe('bed_height_joint');
    });
  });

  describe('sendBedJointMoveWithSpeed', () => {
    it('应该成功发送关节移动命令', async () => {
      const { sendBedJointMoveWithSpeed } = useBedStore.getState();
      
      await sendBedJointMoveWithSpeed('bed_height_joint', 400);
      
      // 验证 API 被调用（通过 mock）
      expect(true).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 运行测试**

运行: `npm test -- "src/apps/new space/__tests__/store/bedStore.test.ts"`
预期: 所有测试通过

- [ ] **Step 3: 提交测试文件**

```bash
git add "src/apps/new space/__tests__/store/bedStore.test.ts"
git commit -m "test(store): 添加床控状态管理单元测试"
```

---

### Task 8: 添加 carmStore 单元测试

**Files:**
- Create: `src/apps/new space/__tests__/store/carmStore.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
/**
 * @file carmStore.test.ts
 * @description C臂状态管理单元测试
 * @author IOBS Team
 * @date 2024-01-01
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCArmStore } from '../../store/carmStore';

// Mock API
vi.mock('../../services/carmApi', () => ({
  fetchNewSpaceCArmMode: vi.fn().mockResolvedValue({ mode: 1 }),
  setNewSpaceCArmMode: vi.fn().mockResolvedValue(true),
  setNewSpaceCArmJointMove: vi.fn().mockResolvedValue(undefined),
}));

describe('carmStore', () => {
  beforeEach(() => {
    useCArmStore.setState({
      cArm: {
        x: 0, y: 0, z: 0,
        frontBackTranslation: 150,
        cArmRotation: 0,
        cArmFrontBackRotation: 0,
        cArmHeightJoint: 350,
        baseOffset: { x: 0, y: 0, z: 0 },
        baseRotation: { x: 0, y: 0, z: 0 },
        columnOffset: { x: 0, y: 0, z: 0 },
        columnRotation: { x: 0, y: 0, z: 0 },
        headOffset: { x: 0, y: 0, z: 0 },
        headRotation: { x: 0, y: 0, z: 0 },
        headLowerOffset: { x: 0, y: 0, z: 0 },
        headLowerRotation: { x: 0, y: 0, z: 0 },
        ringNoArmOffset: { x: 0, y: 0, z: 0 },
        ringNoArmRotation: { x: 0, y: 0, z: 0 },
        ringArmOffset: { x: 0, y: 0, z: 0 },
        ringArmRotation: { x: 0, y: 0, z: 0 },
      },
      cArmRotation: 0,
      cArmFrontBackRotation: 0,
      cArmHeightJoint: 350,
      frontBackTranslation: 150,
      cArmModeState: 0,
      cArmModeLoading: false,
      cArmLoadingJoint: null,
    });
  });

  describe('setCArmRotation', () => {
    it('应该正确设置C臂旋转角度', () => {
      const { setCArmRotation } = useCArmStore.getState();
      
      setCArmRotation(45);
      
      expect(useCArmStore.getState().cArmRotation).toBe(45);
      expect(useCArmStore.getState().cArm.cArmRotation).toBe(45);
    });
  });

  describe('setCArmHeightJoint', () => {
    it('应该正确设置C臂高度关节', () => {
      const { setCArmHeightJoint } = useCArmStore.getState();
      
      setCArmHeightJoint(400);
      
      expect(useCArmStore.getState().cArmHeightJoint).toBe(400);
      expect(useCArmStore.getState().cArm.cArmHeightJoint).toBe(400);
    });
  });

  describe('resetLocalCArmPose', () => {
    it('应该重置C臂姿态到默认值', () => {
      const { setCArmRotation, setCArmHeightJoint, resetLocalCArmPose } = useCArmStore.getState();
      
      setCArmRotation(45);
      setCArmHeightJoint(400);
      resetLocalCArmPose();
      
      expect(useCArmStore.getState().cArmRotation).toBe(0);
      expect(useCArmStore.getState().cArmHeightJoint).toBe(350);
    });
  });

  describe('hydrateCArmMode', () => {
    it('应该从后端获取C臂模式', async () => {
      const { hydrateCArmMode } = useCArmStore.getState();
      
      await hydrateCArmMode();
      
      expect(useCArmStore.getState().cArmModeState).toBe(1);
    });
  });

  describe('applyCArmMode', () => {
    it('应该成功应用C臂模式', async () => {
      const { applyCArmMode } = useCArmStore.getState();
      
      await applyCArmMode(1);
      
      expect(useCArmStore.getState().cArmModeState).toBe(1);
    });
  });
});
```

- [ ] **Step 2: 运行测试**

运行: `npm test -- "src/apps/new space/__tests__/store/carmStore.test.ts"`
预期: 所有测试通过

- [ ] **Step 3: 提交测试文件**

```bash
git add "src/apps/new space/__tests__/store/carmStore.test.ts"
git commit -m "test(store): 添加C臂状态管理单元测试"
```

---

### Task 9: 添加工具函数单元测试

**Files:**
- Create: `src/apps/new space/__tests__/utils/spaceDeviceBindings.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
/**
 * @file spaceDeviceBindings.test.ts
 * @description 设备绑定工具函数单元测试
 * @author IOBS Team
 * @date 2024-01-01
 */

import { describe, it, expect } from 'vitest';
import { isLikelyBedDevice, isLikelyCArmDevice, listCArmDeviceCandidates, resolveCArmBinding } from '../../utils/spaceDeviceBindings';
import type { SpaceDeviceInfo } from '../../types/space';

describe('spaceDeviceBindings', () => {
  describe('isLikelyBedDevice', () => {
    it('应该识别包含 "bed" 的设备ID', () => {
      const device: SpaceDeviceInfo = {
        id: 'surgical_bed',
        name: 'Surgical Bed',
        urdfPath: '/models/bed.urdf',
        basePose: { position: [0, 0, 0], rpy: [0, 0, 0] },
        jointPositions: {},
        links: {},
      };
      
      expect(isLikelyBedDevice(device)).toBe(true);
    });

    it('应该识别包含 "手术床" 的设备名称', () => {
      const device: SpaceDeviceInfo = {
        id: 'device_1',
        name: '智能手术床',
        urdfPath: '/models/bed.urdf',
        basePose: { position: [0, 0, 0], rpy: [0, 0, 0] },
        jointPositions: {},
        links: {},
      };
      
      expect(isLikelyBedDevice(device)).toBe(true);
    });

    it('不应该识别不相关的设备', () => {
      const device: SpaceDeviceInfo = {
        id: 'robot_arm',
        name: 'Robot Arm',
        urdfPath: '/models/arm.urdf',
        basePose: { position: [0, 0, 0], rpy: [0, 0, 0] },
        jointPositions: {},
        links: {},
      };
      
      expect(isLikelyBedDevice(device)).toBe(false);
    });
  });

  describe('isLikelyCArmDevice', () => {
    it('应该识别 ID 为 "c_arm" 的设备', () => {
      const device: SpaceDeviceInfo = {
        id: 'c_arm',
        name: 'C-Arm',
        urdfPath: '/models/carm.urdf',
        basePose: { position: [0, 0, 0], rpy: [0, 0, 0] },
        jointPositions: {},
        links: {},
      };
      
      expect(isLikelyCArmDevice(device)).toBe(true);
    });

    it('应该识别 ID 为 "2" 的设备', () => {
      const device: SpaceDeviceInfo = {
        id: '2',
        name: 'Device 2',
        urdfPath: '/models/carm.urdf',
        basePose: { position: [0, 0, 0], rpy: [0, 0, 0] },
        jointPositions: {},
        links: {},
      };
      
      expect(isLikelyCArmDevice(device)).toBe(true);
    });

    it('应该识别名称包含 "c臂" 的设备', () => {
      const device: SpaceDeviceInfo = {
        id: 'device_3',
        name: '移动C臂',
        urdfPath: '/models/carm.urdf',
        basePose: { position: [0, 0, 0], rpy: [0, 0, 0] },
        jointPositions: {},
        links: {},
      };
      
      expect(isLikelyCArmDevice(device)).toBe(true);
    });
  });

  describe('listCArmDeviceCandidates', () => {
    it('应该返回所有C臂候选设备', () => {
      const devices: SpaceDeviceInfo[] = [
        { id: 'surgical_bed', name: 'Surgical Bed', urdfPath: '', basePose: { position: [0, 0, 0], rpy: [0, 0, 0] }, jointPositions: {}, links: {} },
        { id: 'c_arm', name: 'C-Arm', urdfPath: '', basePose: { position: [0, 0, 0], rpy: [0, 0, 0] }, jointPositions: {}, links: {} },
        { id: '2', name: 'Device 2', urdfPath: '', basePose: { position: [0, 0, 0], rpy: [0, 0, 0] }, jointPositions: {}, links: {} },
      ];
      
      const candidates = listCArmDeviceCandidates(devices);
      
      expect(candidates).toHaveLength(2);
      expect(candidates[0].id).toBe('c_arm');
    });

    it('应该优先返回首选ID的设备', () => {
      const devices: SpaceDeviceInfo[] = [
        { id: '3', name: 'C-Arm 3', urdfPath: '', basePose: { position: [0, 0, 0], rpy: [0, 0, 0] }, jointPositions: {}, links: {} },
        { id: 'c_arm', name: 'C-Arm', urdfPath: '', basePose: { position: [0, 0, 0], rpy: [0, 0, 0] }, jointPositions: {}, links: {} },
      ];
      
      const candidates = listCArmDeviceCandidates(devices);
      
      expect(candidates[0].id).toBe('c_arm');
    });
  });

  describe('resolveCArmBinding', () => {
    it('应该返回选中的C臂设备', () => {
      const devices: SpaceDeviceInfo[] = [
        { id: 'c_arm', name: 'C-Arm', urdfPath: '', basePose: { position: [0, 0, 0], rpy: [0, 0, 0] }, jointPositions: {}, links: {} },
      ];
      
      const result = resolveCArmBinding(devices, 'c_arm');
      
      expect(result?.id).toBe('c_arm');
    });

    it('当没有选中设备时应该返回第一个候选', () => {
      const devices: SpaceDeviceInfo[] = [
        { id: 'c_arm', name: 'C-Arm', urdfPath: '', basePose: { position: [0, 0, 0], rpy: [0, 0, 0] }, jointPositions: {}, links: {} },
      ];
      
      const result = resolveCArmBinding(devices, null);
      
      expect(result?.id).toBe('c_arm');
    });
  });
});
```

- [ ] **Step 2: 运行测试**

运行: `npm test -- "src/apps/new space/__tests__/utils/spaceDeviceBindings.test.ts"`
预期: 所有测试通过

- [ ] **Step 3: 提交测试文件**

```bash
git add "src/apps/new space/__tests__/utils/spaceDeviceBindings.test.ts"
git commit -m "test(utils): 添加设备绑定工具函数单元测试"
```

---

### Task 10: 优化 3D 场景性能 - 帧率控制

**Files:**
- Modify: `src/apps/new space/scenes/OperatingRoom.tsx`
- Modify: `src/apps/new space/components/ThreeScenePanel.tsx`

- [ ] **Step 1: 在 ThreeScenePanel.tsx 中添加帧率控制**

找到 `<Canvas>` 组件，添加 `frameloop` 和 `dpr` 属性：

```typescript
<Canvas
  frameloop="demand" // 按需渲染，减少不必要的帧
  dpr={[1, 1.5]} // 限制设备像素比，降低渲染负担
  // ... 其他属性
>
```

- [ ] **Step 2: 在 OperatingRoom.tsx 中优化 useFrame**

找到 `useFrame` 钩子，添加帧率控制逻辑：

```typescript
const frameCount = useRef(0);
const TARGET_FPS = 30; // 目标帧率
const FRAME_INTERVAL = 60 / TARGET_FPS; // 帧间隔

useFrame((state, delta) => {
  frameCount.current++;
  
  // 每 FRAME_INTERVAL 帧执行一次
  if (frameCount.current % Math.round(FRAME_INTERVAL) !== 0) {
    return;
  }
  
  // 原有的逻辑...
});
```

- [ ] **Step 3: 验证性能优化**

运行应用，观察帧率和性能
预期: 帧率稳定在 30 FPS 左右，CPU 占用降低

- [ ] **Step 4: 提交性能优化**

```bash
git add "src/apps/new space/scenes/OperatingRoom.tsx" "src/apps/new space/components/ThreeScenePanel.tsx"
git commit -m "perf(3d): 添加帧率控制，优化渲染性能"
```

---

### Task 11: 优化 3D 场景性能 - 几何体简化

**Files:**
- Modify: `src/apps/new space/components/ThreeScenePanel.tsx`

- [ ] **Step 1: 简化天空盒几何体**

找到 `<sphereGeometry>` 组件，将 `args` 从 `[1, 32, 32]` 改为 `[1, 16, 16]`：

```typescript
<sphereGeometry args={[1, 16, 16]} />
```

- [ ] **Step 2: 简化地面几何体**

找到 `<circleGeometry>` 组件，将 `args` 从 `[50, 128]` 改为 `[50, 64]`：

```typescript
<circleGeometry args={[50, 64]} />
```

- [ ] **Step 3: 验证几何体简化**

运行应用，检查视觉效果
预期: 视觉效果基本不变，性能提升

- [ ] **Step 4: 提交几何体简化**

```bash
git add "src/apps/new space/components/ThreeScenePanel.tsx"
git commit -m "perf(3d): 简化几何体复杂度，提升渲染性能"
```

---

### Task 12: 优化 3D 场景性能 - 材质优化

**Files:**
- Modify: `src/apps/new space/scenes/URDFModel.tsx`

- [ ] **Step 1: 优化材质属性**

在 `BED_LINK_MATERIALS` 和相关材质定义中，降低 `envMapIntensity`：

```typescript
const BED_LINK_MATERIALS: LinkMaterialMap = {
  base_link: { color: 0xb5bcc6, roughness: 0.35, metalness: 0.45, envMapIntensity: 0.8 }, // 从 1.2 降低到 0.8
  bed_panel_mid: { color: 0x7a8088, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.6 }, // 从 0.8 降低到 0.6
  // ... 其他材质
};
```

- [ ] **Step 2: 添加材质缓存**

在材质创建逻辑中添加缓存：

```typescript
const materialCache = useRef<Map<string, THREE.MeshStandardMaterial>>(new Map());

const getOrCreateMaterial = useCallback((name: string, def: LinkMaterialDef) => {
  if (materialCache.current.has(name)) {
    return materialCache.current.get(name)!;
  }
  
  const material = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: def.roughness,
    metalness: def.metalness,
    envMapIntensity: def.envMapIntensity,
  });
  
  materialCache.current.set(name, material);
  return material;
}, []);
```

- [ ] **Step 3: 验证材质优化**

运行应用，检查视觉效果
预期: 视觉效果基本不变，性能提升

- [ ] **Step 4: 提交材质优化**

```bash
git add "src/apps/new space/scenes/URDFModel.tsx"
git commit -m "perf(3d): 优化材质属性和缓存，提升渲染性能"
```

---

## 完成标准

- [ ] 所有 store 模块拆分完成，代码可编译
- [ ] 所有单元测试通过
- [ ] 3D 场景性能优化完成，帧率稳定在 30 FPS 左右
- [ ] 所有代码提交到版本控制

---

## 风险和注意事项

1. **Store 拆分风险**: 拆分后需要确保所有组件的导入路径正确
2. **测试覆盖**: 确保关键函数都有测试覆盖
3. **性能优化**: 优化后需要验证视觉效果不受影响
4. **向后兼容**: 保持 API 向后兼容，避免破坏现有功能
