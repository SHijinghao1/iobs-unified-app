/**
 * @file presetApi.ts
 * @description 预设API服务，负责姿态预设相关的API调用
 * @author IOBS Team
 * @date 2024-01-01
 */

import { ioFetch, API_VERSION, IOBS_API_BASE_URL, isPlainObject, resolveStatusImageUrl } from './iobsApi';

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
  keyOrder?: string[];
  error?: string;
}

export interface ApplyPoseResult {
  ok: boolean;
  error?: string;
}

const toNum = (v: unknown): number => {
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

const normalizeState = (state: unknown): BedStatusPoseItem['state'] | null => {
  if (!isPlainObject(state)) return null;
  return {
    bed_height_joint: toNum(state.bed_height_joint),
    bed_tilt_joint: toNum(state.bed_tilt_joint),
    bed_lateral_joint: toNum(state.bed_lateral_joint),
    bed_front_back_joint: toNum(state.bed_front_back_joint),
    bed_panel_back_joint: toNum(state.bed_panel_back_joint),
    bed_panel_left_leg_joint: toNum(state.bed_panel_left_leg_joint),
    bed_panel_right_leg_joint: toNum(state.bed_panel_right_leg_joint),
  };
};

const normalizeBedStatusPayload = (payload: { status?: Record<string, unknown> }): Record<string, BedStatusPoseItem> => {
  const statusRaw = payload.status;
  if (!isPlainObject(statusRaw)) return {};

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

const normalizeDemoListPayload = (payload: { demo_list?: Record<string, unknown> }): Record<string, BedStatusPoseItem> => {
  const demoRaw = payload.demo_list;
  if (!isPlainObject(demoRaw)) return {};

  return Object.fromEntries(
    Object.entries(demoRaw).flatMap(([id, item]) => {
      if (!isPlainObject(item)) return [];

      const name = String(item.name ?? id);
      const image = typeof item.image === 'string' ? resolveStatusImageUrl(item.image) : undefined;

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

      const normalized = normalizeState(item.state ?? item.status);
      if (normalized) {
        return [[id, { name, image, state: normalized }]];
      }

      return [[id, { name, image, state: defaultState }]];
    })
  );
};

const extractJsonKeyOrder = (rawText: string): string[] => {
  const statusMatch = rawText.match(/"status"\s*:\s*\{/);
  if (!statusMatch) return [];
  const startIdx = statusMatch.index! + statusMatch[0].length;
  let depth = 0;
  let i = startIdx;
  const keys: string[] = [];
  while (i < rawText.length) {
    const ch = rawText[i];
    if (ch === '{' || ch === '[') { depth++; }
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth < 0) break;
    } else if (depth === 0 && ch === '"') {
      const endQuote = rawText.indexOf('"', i + 1);
      if (endQuote > i + 1) {
        keys.push(rawText.slice(i + 1, endQuote));
        i = endQuote + 1;
        continue;
      }
    }
    i++;
  }

  if (import.meta.env.DEV && keys.length > 0) {
    console.log('[extractJsonKeyOrder] extracted keys:', keys);
  }

  return keys;
};

export const fetchBedStatusList = async (): Promise<BedStatusListResponse | null> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/get_status?version=${API_VERSION}`);
    const rawText = await response.text().catch(() => '{}');
    const payload = JSON.parse(rawText);
    if (!response.ok) {
      return { status: {}, error: typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}` };
    }
    return {
      status: normalizeBedStatusPayload(payload),
      keyOrder: extractJsonKeyOrder(rawText),
      error: typeof payload?.error === 'string' ? payload.error : undefined,
    };
  } catch {
    return null;
  }
};

export const fetchDemoList = async (): Promise<BedStatusListResponse | null> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/get_demo_list?version=${API_VERSION}`);
    const rawText = await response.text().catch(() => '{}');
    const payload = JSON.parse(rawText);
    if (!response.ok) {
      return { status: {}, error: typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}` };
    }
    return {
      status: normalizeDemoListPayload(payload),
      keyOrder: extractJsonKeyOrder(rawText),
      error: typeof payload?.error === 'string' ? payload.error : undefined,
    };
  } catch {
    return null;
  }
};

export const applyBedStatusById = async (id: string): Promise<ApplyPoseResult> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/set_status?version=${API_VERSION}&status_id=${encodeURIComponent(id)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}` };
    }
    return { ok: payload?.ok !== false, error: typeof payload?.error === 'string' ? payload.error : undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network_error' };
  }
};

export const applyDemoById = async (id: string): Promise<ApplyPoseResult> => {
  try {
    const response = await ioFetch(`${IOBS_API_BASE_URL}/set_demo?version=${API_VERSION}&demo_id=${encodeURIComponent(id)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}` };
    }
    return { ok: payload?.ok !== false, error: typeof payload?.error === 'string' ? payload.error : undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network_error' };
  }
};

export const fetchNewSpaceBedStatusList = fetchBedStatusList;
export const fetchNewSpaceDemoList = fetchDemoList;
export const applyNewSpaceBedStatusById = applyBedStatusById;
export const applyNewSpaceDemoById = applyDemoById;
