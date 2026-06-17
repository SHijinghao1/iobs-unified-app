/**
 * space/store/services/api.ts（空间端 API 层）
 * - 统一封装后端请求、超时中断与错误节流
 * - 提供设备状态、姿态库、演示流程等接口能力
 * - 做响应结构归一化，减少上层判空与兼容逻辑负担
 */


const inferDefaultApiBase = () => {
  if (typeof window !== 'undefined' && /^\/surgical-bed(\/|$)/.test(window.location.pathname)) {
    return '/surgical-bed/iobs-api';
  }
  return '/iobs-api';
};

export const IOBS_API_BASE_URL =
  import.meta.env.VITE_API_URL || inferDefaultApiBase();

import { WORLD_TO_MM } from '../../constants/machine';
import type { SpacePose } from '../../types';
import type {
  HealthCheckResult,
  DeviceState,
  DeviceConfig,
  SpaceDevice,
  SpaceResponse,
  DevicePositionResponse,
  BedStatusPoseItem,
  BedStatusListResponse,
  DemoListResponse,
  JointMoveResult,
  CArmModeResponse,
  DeviceErrorInfo,
  FullSpaceDataResult,
  GetPosErrorsResult,
} from '../../types/api';

export type { DeviceState, SpaceDevice, DevicePositionResponse, BedStatusPoseItem };

const API_BASE_URL = IOBS_API_BASE_URL;
const API_VERSION = '1.0';
const FETCH_TIMEOUT_MS = 12_000;
const NETWORK_ERROR_LOG_COOLDOWN_MS = 5000;

let bedStatusApiUnavailable = false;

const MAX_ERROR_LOGS = 100;
const errorLogTimestamps = new Map<string, number>();

const isAbortError = (e: unknown): boolean =>
  (e instanceof DOMException && e.name === 'AbortError') ||
  (e instanceof Error && e.name === 'AbortError');

const logApiError = (key: string, message: string, error: unknown) => {
  // 轮询场景下的主动中断/超时由上层容错，不在控制台反复刷红。
  if (isAbortError(error)) return;
  
  // 记录 HTTP 500 错误，帮助排查后端异常崩溃问题
  if (error instanceof Error && error.message.includes('500')) {
    console.error(`[Backend 500] ${message}`, error);
  }

  const now = Date.now();
  const lastLoggedAt = errorLogTimestamps.get(key) ?? 0;
  if (now - lastLoggedAt < NETWORK_ERROR_LOG_COOLDOWN_MS) return;

  // 简单清理，防止 Map 无限增长
  if (errorLogTimestamps.size > MAX_ERROR_LOGS) {
    const firstKey = errorLogTimestamps.keys().next().value;
    if (firstKey !== undefined) errorLogTimestamps.delete(firstKey);
  }

  errorLogTimestamps.set(key, now);
  console.error(message, error);
};

/** 供界面与日志使用的连接排查短文案 */
export const getApiConnectionTroubleshootHint = (): string => {
  return `API 基址：${API_BASE_URL}`;
};

/**
 * 带超时的 fetch，避免接口挂死时长时间无响应
 */
export async function ioFetch(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const abortReason = new DOMException(
    `Request timed out after ${FETCH_TIMEOUT_MS}ms`,
    'AbortError'
  );
  const timer = setTimeout(() => controller.abort(abortReason), FETCH_TIMEOUT_MS);
  const externalSignal = init?.signal;
  const forwardExternalAbort = () => {
    controller.abort(
      externalSignal?.reason instanceof Error
        ? externalSignal.reason
        : new DOMException('Request aborted by caller', 'AbortError')
    );
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      forwardExternalAbort();
    } else {
      externalSignal.addEventListener('abort', forwardExternalAbort, { once: true });
    }
  }

  try {
    const { signal: _s, ...rest } = init ?? {};
    const response = await fetch(input, { ...rest, signal: controller.signal });
    
    if (response.status === 500) {
      throw new Error(`HTTP 500: Internal Server Error at ${input}`);
    }
    
    return response;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', forwardExternalAbort);
  }
}

/** GET /health，用于进入设置页时快速探测后端 */
export async function fetchBackendHealth(): Promise<HealthCheckResult> {
  const t0 = performance.now();
  try {
    const response = await ioFetch(`${API_BASE_URL}/health`);
    const latencyMs = Math.round(performance.now() - t0);
    if (!response.ok) {
      return { ok: false, latencyMs, errorKind: 'http', httpStatus: response.status };
    }
    return { ok: true, latencyMs };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - t0);
    return {
      ok: false,
      latencyMs,
      errorKind: isAbortError(e) ? 'timeout' : 'network',
    };
  }
}

export function healthCheckUserMessage(result: HealthCheckResult): string {
  if (result.ok) return '';
  if (result.errorKind === 'timeout') {
    return `连接超时（>${FETCH_TIMEOUT_MS / 1000}s），后端可能未启动或网络不通。`;
  }
  if (result.errorKind === 'http') {
    return `HTTP ${result.httpStatus ?? '?'}，健康检查未通过。`;
  }
  return '无法连接后端（网络错误或地址不可达）。';
}

/**
 * 后端数值归一化：将米(m) 统一转为 毫米(mm)，以适配后端不同设备/版本的单位差异问题
 */
const normalizeBackendLinear = (value: number, fieldName?: string) => {
  if (value === null || value === undefined) return 0;
  
  // 针对特定字段名（如包含 height/lateral/FB 等），通常这些值在毫米单位下较大
  // 如果这些值小于 100 且非 0，极大概率是米。
  const isMeter = Math.abs(value) <= 100 && value !== 0;
  
  if (isMeter) {
    return value * WORLD_TO_MM;
  }
  return value;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const resolveSnapshotState = (entry: Record<string, unknown>) => {
  const nested = isPlainObject(entry.state) ? entry.state : entry;
  return {
    position: nested.position,
    rotation: nested.rotation,
    joints: nested.joints,
  };
};

const DEVICE_NAME_ALIASES = {
  surgical_bed: ['surgical_bed', 'surgery_bed', 'bed', '1'],
  c_arm: ['c_arm', 'carm', 'arm', '2'],
} as const;

const resolveStatusImageUrl = (rawImage: string): string | undefined => {
  if (!rawImage) return rawImage;
  if (/^(https?:)?\/\//i.test(rawImage) || rawImage.startsWith('data:') || rawImage.startsWith('blob:')) {
    return rawImage;
  }

  // 统一路径格式：剥离所有可能的旧前缀
  const cleanPath = rawImage
    .replace(/^\//, '')
    .replace(/^surgical-bed\//i, '')
    .replace(/^iobs-api\//i, '')
    .replace(/^iobs_api\//i, '')
    .replace(/^status\//i, '');

  // 兼容后端仅返回文件名（如 status01.png）的情况
  const normalizedName = cleanPath.toLowerCase();

  // 复位 / 换床 等没有真实图片的历史占位图，直接不展示图片
  const placeholderNoImageSet = new Set(['zero.jpg', 'exchange.jpg']);
  if (placeholderNoImageSet.has(normalizedName)) {
    return undefined;
  }

  const filename = cleanPath;

  // 优先走后端代理路径；后端未挂静态资源时再回落到前端 public/status
  const backendUrl = `${API_BASE_URL.replace(/\/+$/, '')}/status/${filename}`;
  const basePrefix =
    typeof window !== 'undefined' && /^\/surgical-bed(\/|$)/.test(window.location.pathname)
      ? '/surgical-bed'
      : '';
  const fallbackUrl = `${basePrefix}/status/${filename}`;

  const finalUrl = `${fallbackUrl}?v=status-local-20260423`;
  console.log(`[ImageResolution] ${rawImage} -> ${backendUrl} (fallback: ${fallbackUrl})`);
  return finalUrl;
};

/**
 * 统一归一化手术床/演示姿态状态的逻辑
 */
const normalizeBedStatusPayload = (payload: { status?: Record<string, any> }): Record<string, BedStatusPoseItem> => {
  const statusRaw = payload.status;
  if (!isPlainObject(statusRaw)) return {};

  const normalizeState = (state: any): BedStatusPoseItem['state'] | null => {
    if (!isPlainObject(state)) return null;
    const num = (v: any) => {
      const n = Number(v ?? 0);
      return isNaN(n) ? 0 : n;
    };
    return {
      bed_height_joint: num(state.bed_height_joint),
      bed_tilt_joint: num(state.bed_tilt_joint),
      bed_lateral_joint: num(state.bed_lateral_joint),
      bed_front_back_joint: num(state.bed_front_back_joint),
      bed_panel_back_joint: num(state.bed_panel_back_joint),
      bed_panel_left_leg_joint: num(state.bed_panel_left_leg_joint),
      bed_panel_right_leg_joint: num(state.bed_panel_right_leg_joint),
    };
  };

  return Object.fromEntries(
    Object.entries(statusRaw).flatMap(([id, item]) => {
      if (!isPlainObject(item)) return [];
      const normalized = normalizeState(item.state ?? item.status);
      if (!normalized) return [];
      return [[id, {
        name: String(item.name ?? id),
        image: typeof item.image === 'string' ? resolveStatusImageUrl(item.image) : undefined,
        state: normalized,
      }]];
    })
  ) as Record<string, BedStatusPoseItem>;
};

/** GET /get_status?version=1.0 获取手术床姿态列表 */
export const fetchBedStatusList = async (): Promise<BedStatusListResponse | null> => {
  if (bedStatusApiUnavailable) return null;
  try {
    const response = await ioFetch(`${API_BASE_URL}/get_status?version=${API_VERSION}`);
    if (!response.ok) {
      if (response.status === 404) {
        bedStatusApiUnavailable = true;
      }
      return null;
    }
    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) return null;

    return {
      version: String(payload.version ?? API_VERSION),
      status: normalizeBedStatusPayload(payload),
      error: String(payload.error ?? ''),
    };
  } catch (error) {
    logApiError('fetchBedStatusList', 'Failed to fetch bed status list:', error);
    return null;
  }
};

/** GET /set_status?version=1.0&status_id=xxx 应用指定手术床姿态 */
export const applyBedStatusById = async (statusId: string): Promise<{ ok: boolean; error: string }> => {
  if (bedStatusApiUnavailable) {
    return { ok: false, error: 'get_status 接口未启用（404）' };
  }
  try {
    const response = await ioFetch(
      `${API_BASE_URL}/set_status?version=${API_VERSION}&status_id=${encodeURIComponent(statusId)}`
    );
    if (!response.ok) {
      if (response.status === 404) {
        bedStatusApiUnavailable = true;
      }
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) {
      return { ok: true, error: '' };
    }

    const error = String(payload.error ?? '');
    return { ok: !error, error };
  } catch (error) {
    logApiError('applyBedStatusById', 'Failed to apply bed status by id:', error);
    return { ok: false, error: 'network_error' };
  }
};

/** GET /set_joint_move?version=1.0&joint=xxx&speed=10 手术床/C臂单关节动作 */
export const setJointMove = async (device: 'surgery_bed' | 'c_arm', joint: string, speed: number): Promise<JointMoveResult> => {
  const jointMap: Record<string, string[]> = {
    'bed_height_joint': ['bed_height_joint', 'bed_height', 'height', 'height_joint', 'z'],
    'arm_front_back_joint': ['arm_front_back_joint', 'arm_front_back', 'front_back', 'front_back_translation_joint', 'arm_fb', 'joint2', 'joint_2'],
    'arm_height_joint': ['arm_height_joint', 'arm_height', 'height', 'height_joint', 'z'],
    'arm_tilt_joint': ['arm_tilt_joint', 'arm_tilt', 'tilt', 'tilt_joint'],
    'c_ring_rotation_joint': ['c_ring_rotation_joint', 'c_ring_rotation', 'ring_rotation', 'rotation_joint'],
  };
  
  const candidates = jointMap[joint] || [joint];
  const targetJoint = candidates[0];

  try {
    const response = await ioFetch(
      `${API_BASE_URL}/set_joint_move?version=${API_VERSION}&device=${encodeURIComponent(device)}&joint=${encodeURIComponent(targetJoint)}&speed=${encodeURIComponent(String(speed))}`
    );
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) {
      return { ok: true, error: '' };
    }

    const error = String(payload.error ?? '');
    return { ok: !error, error };
  } catch (error) {
    logApiError('setJointMove', 'Failed to set joint move:', error);
    return { ok: false, error: 'network_error' };
  }
};

/** 手术床关节移动 */
export const setBedJointMove = (joint: string, speed: number) => setJointMove('surgery_bed', joint, speed);

/** C臂关节移动 */
export const setCArmJointMove = (joint: string, speed: number) => setJointMove('c_arm', joint, speed);

/** GET /get_c_arm_mode?version=1.0 获取 C 臂随动模式（1 同步 / -1 镜像 / 0 脱离） */
export const fetchCArmMode = async (): Promise<CArmModeResponse | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/get_c_arm_mode?version=${API_VERSION}`);
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) return null;

    const modeRaw = Number(payload.mode ?? 0);
    return { mode: modeRaw === 1 || modeRaw === -1 ? modeRaw : 0 };
  } catch (error) {
    logApiError('fetchCArmMode', 'Failed to fetch C-arm mode:', error);
    return null;
  }
};

/** GET /set_c_arm_mode?version=1.0&mode=-1 设置 C 臂随动模式 */
export const setCArmMode = async (mode: 1 | -1 | 0): Promise<CArmModeResponse | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/set_c_arm_mode?version=${API_VERSION}&mode=${mode}`);
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) return null;

    const modeRaw = Number(payload.mode ?? mode);
    return { mode: modeRaw === 1 || modeRaw === -1 ? modeRaw : 0 };
  } catch (error) {
    logApiError('setCArmMode', 'Failed to set C-arm mode:', error);
    return null;
  }
};

/** GET /get_demo_list?version=1.0 获取演示姿态列表 */
export const fetchDemoList = async (): Promise<DemoListResponse | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/get_demo_list?version=${API_VERSION}`);
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) return null;

    const demoRaw = isPlainObject(payload.demo_list) ? payload.demo_list : {};
    const toNum = (v: unknown) => {
      const n = Number(v ?? 0);
      return Number.isNaN(n) ? 0 : n;
    };

    const defaultState = {
      bed_height_joint: 0,
      bed_tilt_joint: 0,
      bed_lateral_joint: 0,
      bed_front_back_joint: 0,
      bed_panel_back_joint: 0,
      bed_panel_left_leg_joint: 0,
      bed_panel_right_leg_joint: 0,
    };

    const status = Object.fromEntries(
      Object.entries(demoRaw).flatMap(([id, item]) => {
        if (!isPlainObject(item)) return [];

        const name = String(item.name ?? id);
        const image = typeof item.image === 'string' ? resolveStatusImageUrl(item.image) : undefined;

        // 格式1: status 数组 - 静态姿态帧
        if (Array.isArray(item.status) && item.status.length > 0) {
          const firstFrame = item.status.find((frame) => isPlainObject(frame));
          if (isPlainObject(firstFrame)) {
            return [[id, {
              name,
              image,
              state: {
                bed_height_joint: toNum(firstFrame.bed_height_joint),
                bed_tilt_joint: toNum(firstFrame.bed_tilt_joint),
                bed_lateral_joint: toNum(firstFrame.bed_lateral_joint),
                bed_front_back_joint: toNum(firstFrame.bed_front_back_joint),
                bed_panel_back_joint: toNum(firstFrame.bed_panel_back_joint),
                bed_panel_left_leg_joint: toNum(firstFrame.bed_panel_left_leg_joint),
                bed_panel_right_leg_joint: toNum(firstFrame.bed_panel_right_leg_joint),
              },
            }]];
          }
        }

        // 格式2: moves 数组 - 动态移动指令（使用默认状态）
        if (Array.isArray(item.moves) && item.moves.length > 0) {
          return [[id, {
            name,
            image,
            state: { ...defaultState },
            isDynamic: true,
          }]];
        }

        return [];
      })
    ) as Record<string, BedStatusPoseItem>;

    return {
      version: String(payload.version ?? API_VERSION),
      status,
      error: String(payload.error ?? ''),
    };
  } catch (error) {
    logApiError('fetchDemoList', 'Failed to fetch demo list:', error);
    return null;
  }
};

/** GET /set_demo?version=1.0&demo_id=xxx 应用演示姿态 */
export const applyDemoById = async (statusId: string): Promise<{ ok: boolean; error: string }> => {
  try {
    const response = await ioFetch(
      `${API_BASE_URL}/set_demo?version=${API_VERSION}&demo_id=${encodeURIComponent(statusId)}`
    );

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) {
      return { ok: true, error: '' };
    }

    const error = String(payload.error ?? '');
    if (!error) return { ok: true, error: '' };

    return { ok: false, error };
  } catch (error) {
    logApiError('applyDemoById', 'Failed to apply demo by id:', error);
    return { ok: false, error: 'network_error' };
  }
};

/** GET /set_stop?version=1.0 紧急停止 */
export const sendEmergencyStop = async (): Promise<{ ok: boolean; error: string }> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/set_stop?version=${API_VERSION}`);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) {
      return { ok: true, error: '' };
    }

    const error = String(payload.error ?? '');
    return { ok: !error, error };
  } catch (error) {
    logApiError('sendEmergencyStop', 'Failed to send emergency stop:', error);
    return { ok: false, error: 'network_error' };
  }
};


const normalizeSpaceDevice = (id: string, raw: Record<string, unknown>): SpaceDevice => {
  const toTriple = (value: unknown): [number, number, number] => {
    if (!Array.isArray(value)) return [0, 0, 0];
    return [Number(value[0] ?? 0), Number(value[1] ?? 0), Number(value[2] ?? 0)];
  };

  const toJointMap = (value: unknown): Record<string, number> => {
    if (!isPlainObject(value)) return {};
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, Number(item ?? 0)])
    );
  };

  const stateRaw = isPlainObject(raw.state)
    ? raw.state
    : raw;

  return {
    id,
    name: String(raw.name ?? raw.device ?? id),
    urdfPath: String(raw.urdf_path ?? ''),
    basePose: {
      position: toTriple(stateRaw.position),
      rpy: toTriple(stateRaw.rotation),
    },
    jointPositions: toJointMap(stateRaw.joints),
    links: {},
  };
};

/**
 * 获取空间内全部设备信息
 */
export const fetchSpaceDevices = async (): Promise<SpaceResponse | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/get_space?version=${API_VERSION}`);
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) {
      logApiError('fetchSpaceDevices.shape', 'get_space JSON 非对象', payload);
      return null;
    }
    const spaceRaw = payload.space;
    if (spaceRaw !== undefined && !isPlainObject(spaceRaw)) {
      logApiError('fetchSpaceDevices.space', 'get_space.space 格式异常', spaceRaw);
      return null;
    }

    const spaceEntries = isPlainObject(spaceRaw) ? Object.entries(spaceRaw) : [];
    const normalizedSpace = Object.fromEntries(
      spaceEntries.map(([id, raw]) => [
        id,
        normalizeSpaceDevice(id, isPlainObject(raw) ? raw : {}),
      ])
    );

    return {
      version: String(payload.version ?? API_VERSION),
      space: normalizedSpace,
    };
  } catch (error) {
    logApiError('fetchSpaceDevices', 'Failed to fetch space devices:', error);
    throw error; // 重新抛出，以便上层 store 触发熔断/错误处理
  }
};

/**
 * 获取完整的空间数据（包括所有设备位姿和错误状态），单次调用，降低后端压力
 */
export const fetchFullSpaceData = async (): Promise<FullSpaceDataResult | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/get_pos?version=${API_VERSION}`);
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) return null;

    const version = String(payload.version ?? API_VERSION);
    const globalError = String(payload.error ?? '');
    const posRaw = payload.pos;
    const deviceErrors: DeviceErrorInfo[] = [];
    const devices: Record<string, DevicePositionResponse['pos']> = {};

    if (isPlainObject(posRaw)) {
      for (const [key, entry] of Object.entries(posRaw)) {
        if (!isPlainObject(entry)) continue;
        
        // 提取设备位姿
        const snapshotState = resolveSnapshotState(entry);
        const toTriple = (v: unknown): [number, number, number] => {
          if (!Array.isArray(v)) return [0, 0, 0];
          return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
        };
        const joints = Object.fromEntries(
          Object.entries((isPlainObject(snapshotState.joints) ? snapshotState.joints : {}) as Record<string, unknown>)
            .map(([k, v]) => [k, Number(v ?? 0)])
        );

        devices[key] = {
          basePose: {
            position: toTriple(snapshotState.position),
            rpy: toTriple(snapshotState.rotation),
          },
          jointPositions: joints,
          links: {},
        };

        // 提取设备错误
        const err = String(
          (isPlainObject(snapshotState.joints) ? (snapshotState.joints as Record<string, unknown>).error : '')
          ?? (entry as Record<string, unknown>).error
          ?? ''
        );
        if (err) {
          deviceErrors.push({
            device: String(entry.device ?? key),
            error: err,
          });
        }
      }
    }

    return { version, globalError, deviceErrors, devices };
  } catch (error) {
    logApiError('fetchFullSpaceData', 'Failed to fetch full space data:', error);
    return null;
  }
};

/**
 * 获取指定设备位姿（兼容后端以 device 名称为 key 的 get_pos 格式）
 */
export const fetchDevicePosition = async (deviceId: string): Promise<DevicePositionResponse | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/get_pos?version=${API_VERSION}`);
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) return null;
    const posRaw = payload.pos;
    if (!isPlainObject(posRaw)) return null;

    const directRaw = posRaw[deviceId];
    const deviceEntry = isPlainObject(directRaw) ? directRaw : Object.values(posRaw).find((entry) => {
      if (!isPlainObject(entry)) return false;
      const deviceName = String(entry.device ?? '').toLowerCase();
      const aliases = [
        ...((DEVICE_NAME_ALIASES[deviceId as keyof typeof DEVICE_NAME_ALIASES] ?? []) as readonly string[]),
        deviceId,
      ].map((item) => item.toLowerCase());
      return aliases.includes(deviceName);
    });

    if (!isPlainObject(deviceEntry)) {
      return null;
    }

    const snapshotState = resolveSnapshotState(deviceEntry);

    const toTriple = (value: unknown): [number, number, number] => {
      if (!Array.isArray(value)) return [0, 0, 0];
      return [Number(value[0] ?? 0), Number(value[1] ?? 0), Number(value[2] ?? 0)];
    };

    const joints = Object.fromEntries(
      Object.entries((isPlainObject(snapshotState.joints) ? snapshotState.joints : {}) as Record<string, unknown>)
        .map(([key, value]) => [key, Number(value ?? 0)])
    );

    return {
      version: String(payload.version ?? API_VERSION),
      pos: {
        basePose: {
          position: toTriple(snapshotState.position),
          rpy: toTriple(snapshotState.rotation),
        },
        jointPositions: joints,
        links: {},
      },
    };
  } catch (error) {
    logApiError('fetchDevicePosition', 'Failed to fetch device position:', error);
    throw error; // 重新抛出
  }
};

/**
 * 上报设备状态到后端
 */
export const syncDeviceState = async (state: DeviceState): Promise<boolean> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/devices/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
    return response.ok;
  } catch (error) {
    logApiError('syncDeviceState', 'Failed to sync device state:', error);
    return false;
  }
};

/**
 * 从后端获取设备状态
 */
export const fetchDeviceState = async (device: string): Promise<DeviceState | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/devices/${device}/state`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch device state:', error);
    return null;
  }
};

/**
 * 获取设备配置（关节定义、限制等）
 */
export const fetchDeviceConfig = async (device: string): Promise<DeviceConfig | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/devices/${device}/config`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch device config:', error);
    return null;
  }
};

/**
 * 获取 URDF 文件
 */
export const fetchURDF = async (device: string): Promise<string | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/devices/${device}/urdf`);
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error('Failed to fetch URDF:', error);
    return null;
  }
};

/**
 * 获取所有模型文件列表
 */
export const fetchMeshes = async (device: string): Promise<DeviceConfig['meshes'] | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/devices/${device}/meshes`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch meshes:', error);
    return null;
  }
};

/**
 * 定期同步到后端（默认 100ms，即每秒 10 次）
 */
export const startPeriodicSync = (
  getState: () => DeviceState,
  interval: number = 100
): (() => void) => {
  const timer = setInterval(() => {
    syncDeviceState(getState());
  }, interval);

  return () => clearInterval(timer);
};

export const fetchGetPosErrors = async (): Promise<GetPosErrorsResult | null> => {
  try {
    const response = await ioFetch(`${API_BASE_URL}/get_pos?version=${API_VERSION}`);
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isPlainObject(payload)) return null;

    const globalError = String(payload.error ?? '');
    const posRaw = payload.pos;
    const deviceErrors: DeviceErrorInfo[] = [];

    if (isPlainObject(posRaw)) {
      for (const [key, entry] of Object.entries(posRaw)) {
        if (!isPlainObject(entry)) continue;
        const stateRaw = (entry as Record<string, unknown>).state;
        if (!isPlainObject(stateRaw)) continue;
        const err = String(stateRaw.error ?? '');
        if (err) {
          deviceErrors.push({
            device: String((entry as Record<string, unknown>).device ?? key),
            error: err,
          });
        }
      }
    }

    return { globalError, deviceErrors };
  } catch (error) {
    logApiError('fetchGetPosErrors', 'Failed to fetch get_pos errors:', error);
    throw error; // 重新抛出
  }
};
