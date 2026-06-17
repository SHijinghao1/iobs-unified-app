/**
 * @file backendSync.ts
 * @description 后端同步系统，负责轮询、熔断和恢复逻辑
 * @author IOBS Team
 * @date 2024-01-01
 */

import { fetchBackendHealth } from '../services/iobsApi';

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let consecutiveErrors = 0;
let isCoolingDown = false;

const MAX_CONSECUTIVE_ERRORS = 3;
const POLLING_INTERVAL_MS = 100;
const COOLDOWN_MS = 5000;

export const startBackendPolling = (
  loadFromBackend: () => Promise<void>,
  onError?: (message: string) => void
) => {
  stopBackendPolling();
  
  let inFlight = false;

  pollingTimer = setInterval(() => {
    // 页面不可见时暂停轮询
    if (document.visibilityState === 'hidden') return;
    
    if (inFlight || isCoolingDown) return;
    
    inFlight = true;
    void loadFromBackend()
      .then(() => {
        consecutiveErrors = 0;
      })
      .catch((err) => {
        consecutiveErrors++;
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          isCoolingDown = true;
          onError?.('后端连接不稳定，暂停同步');
          
          setTimeout(() => {
            isCoolingDown = false;
            consecutiveErrors = 0;
          }, COOLDOWN_MS);
        }
      })
      .finally(() => {
        inFlight = false;
      });
  }, POLLING_INTERVAL_MS);
};

export const stopBackendPolling = () => {
  if (pollingTimer !== null) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  consecutiveErrors = 0;
  isCoolingDown = false;
};

export const checkBackendHealth = async (): Promise<boolean> => {
  const result = await fetchBackendHealth();
  return result.ok;
};
