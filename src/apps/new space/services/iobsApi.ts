/**
 * @file iobsApi.ts
 * @description IOBS API服务，负责与后端通信
 * @author IOBS Team
 * @date 2024-01-01
 */

const inferDefaultApiBase = () => {
  if (typeof window !== 'undefined' && /^\/surgical-bed(\/|$)/.test(window.location.pathname)) {
    return '/surgical-bed/iobs-api';
  }
  return '/iobs-api';
};

export const IOBS_API_BASE_URL = import.meta.env.VITE_API_URL || inferDefaultApiBase();
export const API_VERSION = '1.0';
const FETCH_TIMEOUT_MS = 12_000;

export interface JointMoveResult {
  ok: boolean;
  error?: string;
}

export interface CArmModeResponse {
  mode: 1 | -1 | 0;
  auto: 0 | 1;
}

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
}

export interface BedStatusListResponse {
  status: Record<string, BedStatusPoseItem>;
  error?: string;
}

export interface ApplyPoseResult {
  ok: boolean;
  error?: string;
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

export interface DevicePositionData {
  basePose: {
    position: [number, number, number];
    rpy: [number, number, number];
  };
  jointPositions: Record<string, number>;
  links: Record<string, {
    position: [number, number, number];
    rpy: [number, number, number];
  }>;
  stateName?: string;
  stateProgress?: number;
}

export interface FullSpaceDataResult {
  version: string;
  globalError: string;
  deviceErrors: DeviceErrorInfo[];
  devices: Record<string, DevicePositionData>;
}

export interface SpaceDeviceDefinition {
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

export interface SpaceDevicesResponse {
  version: string;
  space: Record<string, SpaceDeviceDefinition>;
}

export interface DeviceStatePayload {
  device: 'surgical_bed' | 'c_arm';
  timestamp: number;
  state: Record<string, unknown>;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export { isPlainObject };

export const ioFetch = async (input: string, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${FETCH_TIMEOUT_MS}ms`, 'AbortError'));
  }, FETCH_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const getApiConnectionTroubleshootHint = () => `API 基址：${IOBS_API_BASE_URL}`;

export const setJointMove = async (device: 'c_arm' | 'surgery_bed' | 'agv', joint: string, speed: number): Promise<JointMoveResult> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/set_joint_move?version=${API_VERSION}&device=${encodeURIComponent(device)}&joint=${encodeURIComponent(joint)}&speed=${encodeURIComponent(String(speed))}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}` };
    }
    return { ok: payload?.ok !== false, error: typeof payload?.error === 'string' ? payload.error : undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network_error' };
  }
};

export const fetchCArmMode = async (): Promise<CArmModeResponse | null> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/get_c_arm_mode?version=${API_VERSION}`);
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({}));
    if (!isPlainObject(payload)) return null;
    const mode = Number(payload?.mode ?? 0);
    const auto = Number(payload?.auto ?? 0);
    return {
      mode: mode === 1 || mode === -1 ? mode : 0,
      auto: auto === 1 ? 1 : 0,
    };
  } catch {
    return null;
  }
};

export const setCArmMode = async (mode: 1 | -1 | 0, auto: 0 | 1 = 0): Promise<boolean> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/set_c_arm_mode?version=${API_VERSION}&mode=${mode}&auto=${auto}`);
    if (!response.ok) return false;
    const payload = await response.json().catch(() => ({}));
    if (!isPlainObject(payload)) return true;
    return payload?.ok !== false;
  } catch {
    return false;
  }
};

const resolveStatusImageUrl = (rawImage: string): string | undefined => {
  if (!rawImage) return rawImage;
  if (/^(https?:)?\/\//i.test(rawImage) || rawImage.startsWith('data:') || rawImage.startsWith('blob:')) {
    return rawImage;
  }

  const cleanPath = rawImage
    .replace(/^\//, '')
    .replace(/^surgical-bed\//i, '')
    .replace(/^iobs-api\//i, '')
    .replace(/^iobs_api\//i, '')
    .replace(/^status\//i, '');

  const normalizedName = cleanPath.toLowerCase();
  const placeholderNoImageSet = new Set(['zero.jpg', 'exchange.jpg']);
  if (placeholderNoImageSet.has(normalizedName)) return undefined;

  const basePrefix =
    typeof window !== 'undefined' && /^\/surgical-bed(\/|$)/.test(window.location.pathname)
      ? '/surgical-bed'
      : '';

  return `${basePrefix}/status/${cleanPath}?v=status-local-20260423`;
};

export { resolveStatusImageUrl };

const normalizeBedStatusPayload = (payload: { status?: Record<string, unknown> }): Record<string, BedStatusPoseItem> => {
  const statusRaw = payload.status;
  if (!isPlainObject(statusRaw)) return {};

  const normalizeState = (state: unknown): BedStatusPoseItem['state'] | null => {
    if (!isPlainObject(state)) return null;
    const num = (v: unknown) => {
      const n = Number(v ?? 0);
      return Number.isNaN(n) ? 0 : n;
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
  );
};

export const fetchPoseList = async (endpoint: string): Promise<BedStatusListResponse | null> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}${endpoint}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { status: {}, error: typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}` };
    }
    return {
      status: normalizeBedStatusPayload(payload),
      error: typeof payload?.error === 'string' ? payload.error : undefined,
    };
  } catch {
    return null;
  }
};

export const applyPoseById = async (endpoint: string, id: string): Promise<ApplyPoseResult> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}${endpoint}/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}` };
    }
    return { ok: payload?.ok !== false, error: typeof payload?.error === 'string' ? payload.error : undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network_error' };
  }
};

const isAbortError = (e: unknown): boolean =>
  (e instanceof DOMException && e.name === 'AbortError') ||
  (e instanceof Error && e.name === 'AbortError');

export const fetchBackendHealth = async (): Promise<HealthCheckResult> => {
  const t0 = performance.now();
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/health`);
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
};

export const healthCheckUserMessage = (result: HealthCheckResult): string => {
  if (result.ok) return '';
  if (result.errorKind === 'timeout') return `后端响应超时（${result.latencyMs}ms）`;
  if (result.errorKind === 'http') return `后端返回错误 HTTP ${result.httpStatus}`;
  return '无法连接到后端服务';
};

export const fetchFullSpaceData = async (): Promise<FullSpaceDataResult | null> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/get_pos?version=${API_VERSION}`);
    if (!response.ok) return null;

    const payload = await response.json().catch(() => ({}));
    if (!isPlainObject(payload)) return null;

    const version = String(payload.version ?? API_VERSION);
    const globalError = String(payload.error ?? '');
    const posRaw = payload.pos;
    const deviceErrors: DeviceErrorInfo[] = [];
    const devices: Record<string, DevicePositionData> = {};

    if (isPlainObject(posRaw)) {
      for (const [key, entry] of Object.entries(posRaw)) {
        if (!isPlainObject(entry)) continue;

        const resolveSnapshotState = (e: Record<string, unknown>) => {
          const nested = isPlainObject(e.state) ? e.state as Record<string, unknown> : e;
          return {
            position: nested.position,
            rotation: nested.rotation ?? (nested as Record<string, unknown>).rpy,
            joints: nested.joints,
            name: nested.name,
            progress: nested.progress,
          };
        };

        const snapshotState = resolveSnapshotState(entry);
        
        const toTriple = (v: unknown): [number, number, number] => {
          if (!Array.isArray(v)) return [0, 0, 0];
          return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
        };

        const position = toTriple(snapshotState.position);
        const rotation = toTriple(snapshotState.rotation);
        
        let jointsRaw: Record<string, unknown> = {};
        if (isPlainObject(snapshotState.joints)) {
          jointsRaw = snapshotState.joints;
        } else {
          const stateWithoutPose = { ...snapshotState } as Record<string, unknown>;
          delete stateWithoutPose.position;
          delete stateWithoutPose.rotation;
          delete stateWithoutPose.rpy;
          delete stateWithoutPose.joints;
          jointsRaw = stateWithoutPose;
        }
        
        const joints = Object.fromEntries(
          Object.entries(jointsRaw)
            .filter(([k, v]) => typeof v === 'number' || typeof v === 'string')
            .map(([k, v]) => [k, Number(v ?? 0)])
        );

        devices[key] = {
          basePose: {
            position,
            rpy: rotation,
          },
          jointPositions: joints,
          links: {},
          stateName: typeof snapshotState.name === 'string' ? snapshotState.name : undefined,
          stateProgress: typeof snapshotState.progress === 'number' ? snapshotState.progress : undefined,
        };

        const err = String(
          (jointsRaw as Record<string, unknown>).error ?? entry.error ?? ''
        );
        if (err) {
          deviceErrors.push({
            device: String(entry.device ?? key),
            error: err,
          });
        }
      }
    }

    return {
      version,
      globalError,
      deviceErrors,
      devices,
    };
  } catch (error) {
    console.error('[fetchFullSpaceData] Error:', error);
    return null;
  }
};

export const fetchSpaceDevices = async (): Promise<SpaceDevicesResponse | null> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/get_space?version=${API_VERSION}`);
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({}));
    if (!isPlainObject(payload)) return null;
    const spaceRaw = isPlainObject(payload.space) ? payload.space : {};

    const normalizeTriple = (value: unknown): [number, number, number] => {
      if (!Array.isArray(value)) return [0, 0, 0];
      return [Number(value[0] ?? 0), Number(value[1] ?? 0), Number(value[2] ?? 0)];
    };

    const normalizedSpace = Object.fromEntries(
      Object.entries(spaceRaw).map(([id, raw]) => {
        const item = isPlainObject(raw) ? raw : {};
        return [id, {
          id,
          name: String(item.name ?? item.device ?? id),
          urdfPath: String(item.urdfPath ?? item.urdf_path ?? ''),
          basePose: {
            position: normalizeTriple(item.position),
            rpy: normalizeTriple(item.rotation ?? item.rpy),
          },
          jointPositions: {},
          links: {},
        } satisfies SpaceDeviceDefinition];
      })
    );

    return {
      version: String(payload.version ?? API_VERSION),
      space: normalizedSpace,
    };
  } catch (error) {
    console.error('[fetchSpaceDevices] Error:', error);
    return null;
  }
};

export const syncDeviceState = async (state: DeviceStatePayload): Promise<boolean> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/devices/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    return response.ok;
  } catch (error) {
    console.error('[syncDeviceState] Error:', error);
    return false;
  }
};

export const fetchDeviceState = async (device: string): Promise<DevicePositionData | null> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/devices/${encodeURIComponent(device)}/state`);
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({}));
    if (!isPlainObject(payload)) return null;

    const toTriple = (v: unknown): [number, number, number] => {
      if (!Array.isArray(v)) return [0, 0, 0];
      return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
    };

    const snapshotState = isPlainObject(payload.state) ? payload.state as Record<string, unknown> : payload as Record<string, unknown>;
    const position = toTriple(snapshotState.position);
    const rotation = toTriple(snapshotState.rotation ?? snapshotState.rpy);

    let jointsRaw: Record<string, unknown> = {};
    if (isPlainObject(snapshotState.joints)) {
      jointsRaw = snapshotState.joints;
    } else {
      const stateWithoutPose = { ...snapshotState };
      delete stateWithoutPose.position;
      delete stateWithoutPose.rotation;
      delete stateWithoutPose.rpy;
      delete stateWithoutPose.joints;
      jointsRaw = stateWithoutPose;
    }

    const joints = Object.fromEntries(
      Object.entries(jointsRaw)
        .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
        .map(([k, v]) => [k, Number(v ?? 0)])
    );

    return {
      basePose: { position, rpy: rotation },
      jointPositions: joints,
      links: {},
    };
  } catch (error) {
    console.error('[fetchDeviceState] Error:', error);
    return null;
  }
};

export const sendEmergencyStop = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/set_stop?version=${API_VERSION}`);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const payload = await response.json().catch(() => ({}));
    if (!isPlainObject(payload)) {
      return { ok: true };
    }
    const error = typeof payload.error === 'string' ? payload.error : undefined;
    return { ok: !error, error };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network_error' };
  }
};
