// 日志系统 API 请求封装
import { downsampleLTTB } from "../utils/lttb";

// Helper function to fetch with timeout
const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 10000, signal, ...restOptions } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new DOMException('Request timeout', 'AbortError')), timeout);

  const abortHandler = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      clearTimeout(id);
      controller.abort(signal.reason);
    } else {
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  }
  
  try {
    return await fetch(resource, {
      ...restOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }
  }
};

// Global state to track offline status and avoid repeated timeouts
const offlineMap: Record<string, { offline: boolean; time: number }> = {};
const OFFLINE_COOLDOWN = 5000; // 5 seconds
const DEFAULT_PORT = '18010';

const isDevServer = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/i.test(window.location.host);

const normalizeServerInput = (serverIp: string) => serverIp.trim().replace(/\/+$/, '');

const isLocalHost = (value: string) => /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);

const buildHttpBase = (serverIp: string) => {
  const normalized = normalizeServerInput(serverIp);
  if (!normalized) return ``;

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return normalized.includes(':')
    ? `http://${normalized}`
    : `http://${normalized}:${DEFAULT_PORT}`;
};

const getBaseCandidates = (serverIp: string) => {
  // 开发模式下使用空的基础URL（通过vite代理）
  if (isDevServer) {
    return [''];
  }

  const normalized = normalizeServerInput(serverIp);
  const candidates: string[] = [];
  const pushCandidate = (value: string) => {
    if (value && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  pushCandidate(buildHttpBase(serverIp));

  if (normalized && !isLocalHost(normalized)) {
    pushCandidate(`http://127.0.0.1:${DEFAULT_PORT}`);
    pushCandidate(`http://localhost:${DEFAULT_PORT}`);
  }

  return candidates;
};

const getWsCandidates = (serverIp: string) => {
  // 开发模式下使用空的基础URL（通过vite代理）
  if (isDevServer) {
    return [''];
  }
  
  return getBaseCandidates(serverIp).map((httpBase) => {
    if (httpBase.startsWith('https://')) {
      return `wss://${httpBase.slice('https://'.length)}`;
    }

    if (httpBase.startsWith('http://')) {
      return `ws://${httpBase.slice('http://'.length)}`;
    }

    return httpBase;
  });
};

const requestWithFallback = async (
  serverIp: string,
  path: string,
  options: RequestInit & { timeout?: number } = {},
) => {
  // 代理模式下直接使用路径，生产模式下添加 server_ip 参数
  const requestPath = isDevServer ? path : `${path}${path.includes('?') ? '&' : '?'}server_ip=${encodeURIComponent(normalizeServerInput(serverIp))}`;
  let lastError: unknown;

  for (const baseUrl of getBaseCandidates(serverIp)) {
    try {
      return await fetchWithTimeout(`${baseUrl}${requestPath}`, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Failed to connect to any backend endpoint');
};

const checkIsOffline = (ip: string) => {
  const s = offlineMap[ip];
  return !!s?.offline && Date.now() - s.time < OFFLINE_COOLDOWN;
};

const shouldMarkOffline = (error: unknown) => {
  if (!error) return false;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      error.name === 'AbortError' ||
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('network error') ||
      message.includes('load failed') ||
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('connection refused')
    );
  }
  return false;
};

const setOffline = (ip: string) => {
  offlineMap[ip] = { offline: true, time: Date.now() };
};

const setOnline = (ip: string) => {
  offlineMap[ip] = { offline: false, time: 0 };
};

// Helper to sanitize JSON keys (remove spaces)
const sanitizeKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeKeys);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      const cleanKey = key.replace(/\s+/g, '');
      newObj[cleanKey] = sanitizeKeys(obj[key]);
    }
    return newObj;
  }
  return obj;
};

export interface LogField {
  ID: number;
  Name: string;
  Type: string;
  Unit: string;
  Port_Type: string;
  Port_Index: string | number;
  Data_Index: string | number;
  Using?: boolean;
  Order?: number;
  Remark?: string;
}

export interface LogDataPoint {
  timestamp: string;
  field_id: number;
  value: any;
}

export interface LogResponse {
  version: string;
  time_begin: string;
  time_end: string;
  total_count: number;
  data: LogDataPoint[];
}

export const getLogInfo = async (
  serverIp: string,
): Promise<{ version: string; Fields: LogField[] }> => {
  try {
    const response = await requestWithFallback(
      serverIp,
      `/get_log_info?version=1.0`,
      { 
        timeout: 10000
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch log info (${response.status})`);
    }
    setOnline(serverIp);
    const rawData = sanitizeKeys(await response.json());

    // 智能解包：处理外层可能增加的 {} 包装 (Smart unwrap: handle possible extra {} wrapper at root)
    let data = rawData;
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      if (rawData.data && typeof rawData.data === 'object' && !Array.isArray(rawData.data)) {
        data = rawData.data;
      } else if (rawData.response && typeof rawData.response === 'object' && !Array.isArray(rawData.response)) {
        data = rawData.response;
      } else {
        // Try to find any key that contains 'fields' or 'version'
        const possibleDataKey = Object.keys(rawData).find(k => 
          rawData[k] && typeof rawData[k] === 'object' && !Array.isArray(rawData[k]) && 
          (rawData[k].fields || rawData[k].Fields || rawData[k].version)
        );
        if (possibleDataKey) {
          data = rawData[possibleDataKey];
        }
      }
    }

    let fieldsArray: LogField[] = [];
    let rawFields = data.fields || data.Fields;

    // 智能解包：处理 fields 可能增加的 {} 包装 (Smart unwrap: handle possible extra {} wrapper for fields)
    if (rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)) {
      const values = Object.values(rawFields);
      const arrayVal = values.find((v) => Array.isArray(v));
      if (arrayVal) {
        rawFields = arrayVal;
      } else if (
        values.length > 0 &&
        typeof values[0] === "object" &&
        values[0] !== null &&
        ("ID" in (values[0] as any) || "field_id" in (values[0] as any))
      ) {
        rawFields = values;
      } else {
        // Maybe it's wrapped in another object like { "data": { "1": { ... } } }
        const innerValues = values.find(v => v && typeof v === 'object' && !Array.isArray(v));
        if (innerValues) {
          const deepValues = Object.values(innerValues);
          if (deepValues.length > 0 && typeof deepValues[0] === 'object' && deepValues[0] !== null && ("ID" in (deepValues[0] as any) || "field_id" in (deepValues[0] as any))) {
            rawFields = deepValues;
          }
        }
      }
    }

    if (Array.isArray(rawFields)) {
      // Handle case where each field is wrapped in an object like { "field": { ID: 1 } }
      fieldsArray = rawFields.map(f => {
        if (f && typeof f === 'object' && !("ID" in f) && !("field_id" in f)) {
          const inner = Object.values(f).find(v => v && typeof v === 'object' && ("ID" in (v as any) || "field_id" in (v as any)));
          return inner ? inner : f;
        }
        return f;
      }) as LogField[];
    }

    return {
      version: data.version || "1.0",
      Fields: fieldsArray,
    };
  } catch (err) {
    if (shouldMarkOffline(err)) {
      setOffline(serverIp);
    }
    console.warn("Failed to fetch log info:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
};

const splitFieldIds = (fields?: string, chunkSize: number = 4) => {
  const ids = (fields || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return [''];
  }

  const chunks: string[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize).join(','));
  }
  return chunks;
};

export const getLog = async (
  serverIp: string,
  time_begin: string,
  time_end: string,
  fields?: string,
): Promise<LogResponse> => {
  try {
    const fieldChunks = splitFieldIds(fields, 4);
    const allParsedData: LogDataPoint[] = [];
    let responseVersion = '1.0';

    for (const fieldChunk of fieldChunks) {
      console.debug(`Fetching log chunk: [${fieldChunk || 'all'}]`);
      const response = await requestWithFallback(
        serverIp,
        `/get_log?version=1.0&time_begin=${time_begin}&time_end=${time_end}${fieldChunk ? `&fields=${fieldChunk}` : ''}`,
        {
          timeout: 10000,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch logs for fields [${fieldChunk || 'all'}] (${response.status})`);
      }

      const rawData = sanitizeKeys(await response.json());
      let payload = rawData;
      if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
        if (rawData.data && typeof rawData.data === 'object' && !Array.isArray(rawData.data)) {
          payload = rawData.data;
        } else if (rawData.response && typeof rawData.response === 'object' && !Array.isArray(rawData.response)) {
          payload = rawData.response;
        } else {
          const possibleDataKey = Object.keys(rawData).find(k => 
            rawData[k] && typeof rawData[k] === 'object' && !Array.isArray(rawData[k]) && 
            (rawData[k].fields || rawData[k].Fields || rawData[k].version)
          );
          if (possibleDataKey) {
            payload = rawData[possibleDataKey];
          }
        }
      }

      responseVersion = payload.version || responseVersion;
      const rawFields = payload.fields || payload.Fields || [];

      if (Array.isArray(rawFields)) {
        rawFields.forEach((field: any) => {
          const fieldId = Number(field.field_id ?? field.Field_Id ?? field.ID ?? field.id ?? 0);
          const dataPoints = Array.isArray(field.data) ? field.data : [];
          dataPoints.forEach((pt: any) => {
            allParsedData.push({
              timestamp: pt.timestamp || pt.Time || '',
              field_id: fieldId,
              value: pt.value ?? pt.Value ?? 0,
            });
          });
        });
      } else if (rawFields && typeof rawFields === 'object') {
        Object.entries(rawFields).forEach(([fieldKey, records]) => {
          if (!Array.isArray(records)) return;
          records.forEach((pt: any) => {
            allParsedData.push({
              timestamp: pt.timestamp || pt.Time || '',
              field_id: Number(pt.field_id ?? pt.Field_Id ?? pt.ID ?? fieldKey),
              value: pt.value ?? pt.Value ?? 0,
            });
          });
        });
      }
    }

    setOnline(serverIp);

    // 按 field_id 对数据进行分组，以便对每个序列分别进行降采样
    const groupedByField: Record<number, LogDataPoint[]> = {};
    allParsedData.forEach((point) => {
      if (!groupedByField[point.field_id]) groupedByField[point.field_id] = [];
      groupedByField[point.field_id].push(point);
    });

    const downsampledData: LogDataPoint[] = [];
    const MAX_POINTS_PER_SERIES = 500; // LTTB 降采样阈值

    Object.values(groupedByField).forEach((series) => {
      const sampled = downsampleLTTB(
        series,
        MAX_POINTS_PER_SERIES,
        (d) => {
          const m = d.timestamp.match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/);
          if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}Z`).getTime();
          return new Date(d.timestamp).getTime();
        },
        (d) => Number(d.value),
      );
      downsampledData.push(...sampled);
    });

    // 根据时间戳和 field_id 重新排序，避免相同时间点顺序抖动
    downsampledData.sort((a, b) => {
      const mA = a.timestamp.match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/);
      const ta = mA ? new Date(`${mA[1]}-${mA[2]}-${mA[3]}T${mA[4]}Z`).getTime() : new Date(a.timestamp).getTime();
      
      const mB = b.timestamp.match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/);
      const tb = mB ? new Date(`${mB[1]}-${mB[2]}-${mB[3]}T${mB[4]}Z`).getTime() : new Date(b.timestamp).getTime();

      if (ta !== tb) return ta - tb;
      return Number(a.field_id) - Number(b.field_id);
    });

    return {
      version: responseVersion,
      time_begin,
      time_end,
      total_count: downsampledData.length,
      data: downsampledData,
    };
  } catch (err) {
    if (shouldMarkOffline(err)) {
      setOffline(serverIp);
    }
    console.warn("Failed to fetch logs:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const checkConnection = async (serverIp: string, force: boolean = false): Promise<boolean> => {
  try {
    if (force) {
      setOnline(serverIp); // Reset offline status to force a check
    } else if (checkIsOffline(serverIp)) {
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
    
    const response = await requestWithFallback(serverIp, `/get_log_info?version=1.0`, {
      signal: controller.signal,
      method: 'GET',
    });
    
    clearTimeout(timeoutId);
    if (response.ok) {
      setOnline(serverIp);
      return true;
    } else {
      setOffline(serverIp);
      return false;
    }
  } catch (err) {
    if (shouldMarkOffline(err)) {
      setOffline(serverIp);
    }
    return false;
  }
};

export const createLiveConnection = (
  serverIp: string,
  onData: (data: LogDataPoint[]) => void,
  onStatus: (connected: boolean) => void,
) => {
  const wsCandidates = getWsCandidates(serverIp);
  const sockets: WebSocket[] = [];
  let settled = false;
  let activeSocket: WebSocket | null = null;

  wsCandidates.forEach((wsUrl) => {
    const ws = new WebSocket(`${wsUrl}/ws`);
    sockets.push(ws);

    ws.onopen = () => {
      if (settled) {
        ws.close();
        return;
      }

      settled = true;
      activeSocket = ws;
      sockets.forEach((socket) => {
        if (socket !== ws) socket.close();
      });
      onStatus(true);
    };

    ws.onmessage = (event) => {
      if (activeSocket && ws !== activeSocket) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === "LIVE_DATA") {
          onData(message.data);
        }
      } catch (e) {
        console.error("解析 WebSocket 消息失败", e);
      }
    };

    ws.onclose = () => {
      if (activeSocket === ws) {
        activeSocket = null;
        onStatus(false);
      }
    };

    ws.onerror = () => {
      if (activeSocket === ws) {
        onStatus(false);
      }
    };
  });

  return () => {
    sockets.forEach((socket) => socket.close());
  };
};
