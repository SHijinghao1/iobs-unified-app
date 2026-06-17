/**
 * @file helpers.ts
 * @description Store 工具函数
 * @author IOBS Team
 * @date 2024-01-01
 */

import type { BedStatusPoseItem } from '../services/presetApi';

let syncDebounceHandle: ReturnType<typeof setTimeout> | null = null;
let lastUserCommandAt = 0;

export const getLastUserCommandAt = () => lastUserCommandAt;

export const scheduleSyncToBackend = (sync: () => Promise<void>, delay = 120) => {
  if (syncDebounceHandle !== null) clearTimeout(syncDebounceHandle);
  syncDebounceHandle = setTimeout(() => {
    syncDebounceHandle = null;
    lastUserCommandAt = Date.now();
    void sync();
  }, delay);
};

export const sortStatusItems = (list: Array<{ id: string; item: BedStatusPoseItem }>) => {
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

export const generateToastId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
