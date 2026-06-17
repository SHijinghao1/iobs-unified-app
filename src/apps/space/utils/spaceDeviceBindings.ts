import type { SpaceDeviceInfo } from '../types';

// 设备绑定辅助：根据命名规则识别手术床和 C 臂。

/** 名称/id 像手术床（用于列表高亮与默认选中） */
export const isLikelyBedDevice = (device: SpaceDeviceInfo): boolean =>
  /bed|table|手术床|surgical|surgery/i.test(device.id) || /bed|table|手术床|surgical|surgery/i.test(device.name);

/** 名称/id 像 C 臂（可多台；用于列表与绑定） */
export const isLikelyCArmDevice = (device: SpaceDeviceInfo): boolean => {
  const idLower = device.id.toLowerCase();
  const nameLower = device.name.toLowerCase();
  if (idLower === 'c_arm' || idLower === '2') return true;
  if (nameLower.includes('c_arm') || /c[-\s]?arm/.test(nameLower) || nameLower.includes('c臂')) return true;
  return false;
};

const PREFERRED_CARM_IDS = ['c_arm', '2'];

/** 所有 C 臂候选（稳定顺序：常见 id 优先） */
export const listCArmDeviceCandidates = (devices: SpaceDeviceInfo[]): SpaceDeviceInfo[] => {
  const c = devices.filter(isLikelyCArmDevice);
  return [...c].sort((a, b) => {
    const ia = PREFERRED_CARM_IDS.indexOf(a.id);
    const ib = PREFERRED_CARM_IDS.indexOf(b.id);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.id.localeCompare(b.id);
  });
};

/**
 * 在多台 C 臂中解析当前绑定：优先使用 selectedCArmDeviceId（若仍在列表中），否则取候选第一台。
 */
export const resolveCArmBinding = (
  devices: SpaceDeviceInfo[],
  selectedCArmDeviceId: string | null
): SpaceDeviceInfo | null => {
  const candidates = listCArmDeviceCandidates(devices);
  if (selectedCArmDeviceId && candidates.some((d) => d.id === selectedCArmDeviceId)) {
    return candidates.find((d) => d.id === selectedCArmDeviceId) ?? null;
  }
  return candidates[0] ?? null;
};

/** @deprecated 请用 resolveCArmBinding(devices, null) */
export const findCArmInDeviceList = (devices: SpaceDeviceInfo[]): SpaceDeviceInfo | null =>
  resolveCArmBinding(devices, null);
