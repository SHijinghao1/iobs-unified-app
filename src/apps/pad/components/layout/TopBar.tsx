import React from 'react';
import { Battery, Activity, Timer, Zap, ShieldAlert, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store';
import clsx from 'clsx';

const BackendStatusIndicator: React.FC = () => {
  const { backendConnectionStatus, backendLatency } = useStore();
  
  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-400',
      bgColor: 'bg-green-400',
      label: `后端已连接 (${backendLatency}ms)`,
      pulse: false,
    },
    degraded: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400',
      label: `后端延迟高 (${backendLatency}ms)`,
      pulse: true,
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-400',
      bgColor: 'bg-red-400',
      label: '后端断开',
      pulse: true,
    },
  };

  const config = statusConfig[backendConnectionStatus];
  const Icon = config.icon;
  const logs = useStore((s) => s.logs);

  const showDebugInfo = () => {
    const lastLogs = logs.slice(0, 5).map(l => l.message).join('\n');
    alert(`调试信息:\n状态: ${backendConnectionStatus}\n最近日志:\n${lastLogs}`);
  };

  return (
    <div 
      className="flex flex-col items-center group cursor-pointer hover:opacity-80 relative"
      onClick={showDebugInfo}
    >
      <Icon 
        size={16} 
        className={clsx(
          "transition-colors duration-300",
          config.color,
          config.pulse && "animate-pulse"
        )} 
      />
      <div className={clsx(
        "w-1.5 h-1.5 rounded-full mt-1",
        config.bgColor,
        config.pulse && "animate-pulse shadow-[0_0_5px_currentColor]"
      )} />
      <div className="absolute top-full mt-2 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
        {config.label}
      </div>
    </div>
  );
};

// 顶栏：显示手术阶段、连接状态、累计剂量和计时。

export const TopBar: React.FC = () => {
  const { surgery, connection } = useStore();
  const stages = ['PREP', 'ACCESS', 'EMBOLIZATION', 'CLOSURE'];
  const stageLabels: Record<string, string> = {
    'PREP': '准备',
    'ACCESS': '穿刺',
    'EMBOLIZATION': '栓塞',
    'CLOSURE': '缝合'
  };
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-11 w-full flex items-center justify-between px-4 bg-deep-space border-b border-gray-800 relative z-50 shadow-lg gap-2">
      {/* 顶栏左侧：手术阶段进度。 */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {stages.map((stage, idx) => {
          const isActive = surgery.stage === stage;
          const isPast = stages.indexOf(surgery.stage) > idx;
          return (
            <div key={stage} className="flex items-center">
              <div 
                className={clsx(
                  "px-3 py-1 rounded-sm text-xs font-bold tracking-wider transition-all duration-300 whitespace-nowrap",
                  isActive ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.3)]" : 
                  isPast ? "text-gray-400" : "text-gray-600"
                )}
              >
                {stageLabels[stage] || stage}
              </div>
              {idx < stages.length - 1 && (
                <div className="mx-1 text-gray-800">/</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 顶栏中间：手术信息摘要 (Pad 系统强化显示 - 使用 Flex 居中替代绝对定位) */}
      <div className="flex-1 flex items-center justify-center space-x-6 min-w-0">
        <div className="flex flex-col items-center shrink-0">
          <span className="text-[7px] text-gray-500 font-mono tracking-widest uppercase mb-0.5">Dose Rate</span>
          <div className="flex items-baseline space-x-1">
            <Zap size={12} className="text-alert-yellow" />
            <span className="text-base font-mono font-bold text-white">12.4</span>
            <span className="text-[8px] text-gray-400">μGy/s</span>
          </div>
        </div>
        <div className="h-5 w-px bg-gray-800 shrink-0" />
        <div className="flex flex-col items-center shrink-0">
          <span className="text-[7px] text-gray-500 font-mono tracking-widest uppercase mb-0.5">Surgery Timer</span>
          <div className="flex items-baseline space-x-1">
            <Timer size={12} className="text-neon-cyan" />
            <span className="text-base font-mono font-bold text-white">{formatTime(surgery.elapsedTime)}</span>
          </div>
        </div>
      </div>

      {/* 顶栏右侧：状态指示器。 */}
      <div className="flex items-center space-x-4 shrink-0">
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-2 mb-0.5">
            <BackendStatusIndicator />
            <div className="flex items-center space-x-1 text-gray-400">
              <ShieldAlert size={12} />
              <span className="text-[9px] font-bold">X-RAY ON</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-2.5 bg-gray-800 rounded-sm overflow-hidden border border-gray-700 relative">
              <div className="h-full bg-neon-green w-4/5" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Battery size={7} className="text-black" />
              </div>
            </div>
            <span className="text-[8px] font-mono text-gray-400">80%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
