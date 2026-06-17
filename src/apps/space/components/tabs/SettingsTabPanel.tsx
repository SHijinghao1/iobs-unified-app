
import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../../store';
import { Trash2, Server, RefreshCw, Activity } from 'lucide-react';
import clsx from 'clsx';
import type { SpaceDeviceInfo } from '../../types';
import type { HealthCheckResult } from '../../types/api';
import { isLikelyBedDevice, isLikelyCArmDevice, resolveCArmBinding } from '../../utils/spaceDeviceBindings';
import {
  IOBS_API_BASE_URL,
  fetchBackendHealth,
  getApiConnectionTroubleshootHint,
  healthCheckUserMessage,
} from '../../store/services/api';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-3">
    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] shrink-0">{children}</h3>
    <div className="flex-1 h-px bg-gray-800" />
  </div>
);

const BedBackendConnectionPanel: React.FC<{
  spaceDevices: SpaceDeviceInfo[];
  selectedBedDeviceId: string | null;
  selectedCArmDeviceId: string | null;
  onSelectBedDevice: (deviceId: string) => void;
  onSelectCArmDevice: (deviceId: string) => void;
  onRefreshDevices: () => Promise<void>;
  onRefreshPositions: () => Promise<void>;
}> = ({
  spaceDevices,
  selectedBedDeviceId,
  selectedCArmDeviceId,
  onSelectBedDevice,
  onSelectCArmDevice,
  onRefreshDevices,
  onRefreshPositions,
}) => {
  const { backendConnectionStatus, backendLatency } = useStore();
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [isRefreshingPosition, setIsRefreshingPosition] = useState(false);

  const isConnected = backendConnectionStatus === 'connected' || backendConnectionStatus === 'degraded';
  const isDegraded = backendConnectionStatus === 'degraded';

  const selectedBed = spaceDevices.find((device) => device.id === selectedBedDeviceId) ?? null;
  const boundCArm = resolveCArmBinding(spaceDevices, selectedCArmDeviceId);
  const canRefreshPositions = Boolean(selectedBedDeviceId || selectedCArmDeviceId);

  const handleRefreshDevices = async () => {
    setIsRefreshingDevices(true);
    try {
      await onRefreshDevices();
    } finally {
      setIsRefreshingDevices(false);
    }
  };

  const handleRefreshPosition = async () => {
    setIsRefreshingPosition(true);
    try {
      await onRefreshPositions();
    } finally {
      setIsRefreshingPosition(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-900/60 rounded-xl border border-cyan-900/50">
      <div
        className={clsx(
          'rounded-xl border px-3 py-2.5 space-y-2',
          isConnected
            ? isDegraded ? 'border-yellow-800/70 bg-yellow-950/25' : 'border-emerald-800/70 bg-emerald-950/25'
            : 'border-red-900/60 bg-red-950/20'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-200">
            <Activity
              size={14}
              className={clsx(
                isConnected ? (isDegraded ? 'text-yellow-400' : 'text-emerald-400') : 'text-red-400'
              )}
            />
            实时连接状态
          </div>
          <div className={clsx(
            "px-2 py-0.5 rounded text-[10px] font-bold",
            isConnected ? (isDegraded ? "bg-yellow-500/20 text-yellow-400" : "bg-emerald-500/20 text-emerald-400") : "bg-red-500/20 text-red-400"
          )}>
            {backendConnectionStatus === 'connected' ? '连接正常' : backendConnectionStatus === 'degraded' ? '延迟较高' : '连接断开'}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className={clsx('text-[11px] leading-snug', isConnected ? 'text-gray-300' : 'text-red-200/95')}>
            {isConnected 
              ? `响应延迟：${backendLatency} ms` 
              : '无法连接到后端服务器，请检查网络或后端程序。'}
          </p>
          <p className="break-all font-mono text-[10px] text-gray-500">{IOBS_API_BASE_URL}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <SectionTitle>设备与位姿</SectionTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshDevices}
            disabled={isRefreshingDevices}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-800 bg-cyan-950/40 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 transition hover:border-cyan-600 hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Server size={12} className={clsx(isRefreshingDevices && 'animate-pulse')} />
            刷新设备
          </button>
          <button
            type="button"
            onClick={handleRefreshPosition}
            disabled={!canRefreshPositions || isRefreshingPosition}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-800 bg-blue-950/40 px-2.5 py-1.5 text-[11px] font-bold text-blue-300 transition hover:border-blue-600 hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={12} className={clsx(isRefreshingPosition && 'animate-spin')} />
            刷新位姿（床+C臂）
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold text-gray-300">空间设备列表</div>
            <div className="text-[10px] text-gray-500">蓝 = 手术床绑定；紫 = C 臂绑定（多台 C 臂时请分别点选）</div>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-[10px] font-mono text-gray-400">
            {spaceDevices.length} 台
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2 -mx-1">
          {spaceDevices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/40 px-3 py-4 text-center text-[11px] text-gray-500">
              暂无空间设备数据，请点击“刷新设备”
            </div>
          ) : (
            spaceDevices.map((device) => {
              const isCArm = isLikelyCArmDevice(device);
              const isBedCandidate = isLikelyBedDevice(device) && !isCArm;
              const isSelectedBed = !isCArm && device.id === selectedBedDeviceId;
              const isSelectedCArm = isCArm && device.id === selectedCArmDeviceId;
              return (
                <button
                  type="button"
                  key={device.id}
                  onClick={() => {
                    if (isCArm) onSelectCArmDevice(device.id);
                    else onSelectBedDevice(device.id);
                  }}
                  className={clsx(
                    'w-full rounded-lg border px-3 py-2 text-left transition',
                    isSelectedBed
                      ? 'border-neon-cyan bg-neon-cyan/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]'
                      : isSelectedCArm
                        ? 'border-purple-500 bg-purple-950/40 shadow-[0_0_0_1px_rgba(168,85,247,0.2)]'
                        : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-semibold text-gray-100">{device.name}</span>
                        {isBedCandidate && (
                          <span className="rounded-full border border-blue-700/60 bg-blue-900/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                            手术床候选
                          </span>
                        )}
                        {isCArm && (
                          <span className="rounded-full border border-purple-600/60 bg-purple-900/25 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                            C 臂候选
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] font-mono text-gray-500">ID: {device.id}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {isSelectedBed && (
                        <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-bold text-neon-cyan">
                          绑定手术床
                        </span>
                      )}
                      {isSelectedCArm && (
                        <span className="rounded-full border border-purple-400/50 bg-purple-900/30 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                          绑定 C 臂
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/80 px-3 py-2.5 text-[11px] text-gray-400">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">手术床模型 ← 后端</div>
            <div className="mt-0.5 flex justify-between gap-2 text-gray-200">
              <span className="truncate">{selectedBed?.name ?? '未选择'}</span>
              <span className="shrink-0 font-mono text-neon-cyan">{selectedBed?.id ?? '—'}</span>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">C 臂模型 ← 后端（当前选中）</div>
            <div className="mt-0.5 flex justify-between gap-2 text-gray-200">
              <span className="truncate">{boundCArm?.name ?? '未识别到 C 臂条目'}</span>
              <span className="shrink-0 font-mono text-purple-300">{boundCArm?.id ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SettingsTabPanel: React.FC = () => {
  const {
    spaceDevices,
    selectedBedDeviceId,
    selectedCArmDeviceId,
    setSelectedBedDeviceId,
    setSelectedCArmDeviceId,
    loadSpaceDevices,
    refreshDevicePositionsFromBackend,
    clearStorage,
    addToast,
  } = useStore();

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <BedBackendConnectionPanel
        spaceDevices={spaceDevices}
        selectedBedDeviceId={selectedBedDeviceId}
        selectedCArmDeviceId={selectedCArmDeviceId}
        onSelectBedDevice={setSelectedBedDeviceId}
        onSelectCArmDevice={setSelectedCArmDeviceId}
        onRefreshDevices={loadSpaceDevices}
        onRefreshPositions={refreshDevicePositionsFromBackend}
      />

      <SectionTitle>危险操作</SectionTitle>
      <button
        onClick={() => { clearStorage(); addToast('存储已清除', 'warning'); }}
        className="w-full py-2.5 rounded-lg border border-red-900 bg-red-900/10 text-red-400 hover:bg-red-900/20 text-xs font-bold flex items-center justify-center gap-2 transition-all">
        <Trash2 size={14} />清除所有数据
      </button>
    </div>
  );
};
