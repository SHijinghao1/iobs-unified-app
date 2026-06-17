// 日志系统全局状态管理
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LogField } from "../services/api";

interface AppSettings {
  serverIp: string;
  adminName: string;
  adminId: string;
  alarmDelaySeconds: number;
  thresholds: Record<number, { warning: number; critical: number }>;
}

interface AppState {
  isDarkMode: boolean;
  isFullscreen: boolean;
  isMuted: boolean;
  muteCountdown: number | null;
  settings: AppSettings;
  connectionStatus: 'online' | 'offline' | 'connecting';
  logFields: LogField[];

  toggleDarkMode: () => void;
  setFullscreen: (val: boolean) => void;
  setMuted: (val: boolean, countdown?: number | null) => void;
  decrementMuteCountdown: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  setConnectionStatus: (status: 'online' | 'offline' | 'connecting') => void;
  setLogFields: (fields: LogField[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      isFullscreen: false,
      isMuted: false,
      muteCountdown: null,
      connectionStatus: 'connecting',
      logFields: [
        { ID: 1, Name: 'CPU 使用率', Unit: '%', Type: 'float', Port_Type: 'TCP', Port_Index: '8080', Data_Index: '1', Using: true, Order: 1, Remark: '核心服务器指标' },
        { ID: 2, Name: '内存占用', Unit: 'MB', Type: 'int', Port_Type: 'UDP', Port_Index: '8081', Data_Index: '2', Using: true, Order: 2, Remark: '系统运行指标' },
        { ID: 3, Name: '磁盘读写', Unit: 'MB/s', Type: 'float', Port_Type: 'TCP', Port_Index: '8082', Data_Index: '3', Using: true, Order: 3, Remark: '系统运行指标' },
        { ID: 4, Name: '网络延迟', Unit: 'ms', Type: 'int', Port_Type: 'ICMP', Port_Index: '-', Data_Index: '4', Using: false, Order: 4, Remark: '-' },
      ],
      settings: {
        serverIp: "192.168.1.200",
        adminName: "Admin",
        adminId: "SYS-001",
        alarmDelaySeconds: 3,
        thresholds: {
          1: { warning: 80, critical: 90 }, // CPU Usage example
          4: { warning: 1000, critical: 2000 }, // Memory Usage example
        },
      },

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setFullscreen: (val) => set({ isFullscreen: val }),
      setMuted: (val, countdown = null) =>
        set({ isMuted: val, muteCountdown: countdown }),
      decrementMuteCountdown: () =>
        set((state) => ({
          muteCountdown:
            state.muteCountdown !== null && state.muteCountdown > 0
              ? state.muteCountdown - 1
              : 0,
        })),
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setLogFields: (fields) => set({ logFields: fields }),
    }),
    {
      name: "iobs-app-storage",
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        settings: state.settings,
      }),
    },
  ),
);
