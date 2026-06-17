/**
 * @file spaceDeviceBindings.ts
 * @description 空间设备绑定工具函数，负责设备识别和绑定逻辑
 * @author IOBS Team
 * @date 2024-01-01
 */

import type { SpaceDeviceInfo } from '../types/space';

export const isLikelyBedDevice = (device: SpaceDeviceInfo): boolean =>
  /bed|table|手术床|surgical|surgery/i.test(device.id) || /bed|table|手术床|surgical|surgery/i.test(device.name);

export const isLikelyCArmDevice = (device: SpaceDeviceInfo): boolean => {
  const idLower = device.id.toLowerCase();
  const nameLower = device.name.toLowerCase();
  if (idLower === 'c_arm' || idLower === '2') return true;
  if (nameLower.includes('c_arm') || /c[-\s]?arm/.test(nameLower) || nameLower.includes('c臂')) return true;
  return false;
};

const PREFERRED_CARM_IDS = ['c_arm', '2'];

export const listCArmDeviceCandidates = (devices: SpaceDeviceInfo[]): SpaceDeviceInfo[] => {
  const candidates = devices.filter(isLikelyCArmDevice);
  return [...candidates].sort((a, b) => {
    const ia = PREFERRED_CARM_IDS.indexOf(a.id);
    const ib = PREFERRED_CARM_IDS.indexOf(b.id);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.id.localeCompare(b.id);
  });
};

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

export const findCArmInDeviceList = (devices: SpaceDeviceInfo[]): SpaceDeviceInfo | null =>
  resolveCArmBinding(devices, null);
