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
        size={18} 
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
    <div className="h-16 w-full flex items-center justify-between px-6 bg-deep-space border-b border-gray-800 relative z-50 shadow-lg">
      {/* 顶栏左侧：手术阶段进度。 */}
      <div className="flex items-center space-x-1">
        {stages.map((stage, idx) => {
          const isActive = surgery.stage === stage;
          const isPast = stages.indexOf(surgery.stage) > idx;
          return (
            <div key={stage} className="flex items-center">
              <div 
                className={clsx(
                  "px-4 py-1 rounded-sm text-sm font-bold tracking-wider transition-all duration-300",
                  isActive ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.3)]" : 
                  isPast ? "text-gray-400" : "text-gray-600"
                )}
              >
                {stageLabels[stage]}
              </div>
              {idx < stages.length - 1 && (
                <div className={clsx("w-8 h-[2px]", isPast ? "bg-neon-cyan" : "bg-gray-700")} />
              )}
            </div>
          );
        })}
      </div>

      {/* 顶栏中间：当前累计剂量。 */}
      <div className="flex items-center space-x-4">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="#333" strokeWidth="4" fill="transparent" />
            <circle 
              cx="24" cy="24" r="20" 
              stroke={surgery.dose > 80 ? '#FF4D4D' : surgery.dose > 60 ? '#FFD700' : '#00FF88'} 
              strokeWidth="4" 
              fill="transparent" 
              strokeDasharray={125.6} 
              strokeDashoffset={125.6 * (1 - surgery.dose / 100)} 
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <Zap size={16} className="absolute text-neon-cyan" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-widest">累积剂量</span>
          <span className="text-lg font-mono font-bold text-neon-cyan">{surgery.dose} mGy</span>
        </div>
      </div>

      {/* 顶栏右侧：设备状态和手术计时。 */}
      <div className="flex items-center space-x-6">
        <div className="flex space-x-3">
            {[
                { key: 'bed', label: 'BED', icon: Activity },
                { key: 'cArm', label: 'C-ARM', icon: ShieldAlert },
                { key: 'agv', label: 'AGV', icon: Battery },
                { key: 'light', label: 'LGT', icon: Zap }
            ].map(({ key, icon: Icon }) => (
                <div key={key} className="flex flex-col items-center group cursor-pointer hover:opacity-80">
                    <Icon 
                        size={18} 
                        className={clsx(
                            "transition-colors duration-300",
                            connection[key as keyof typeof connection] ? "text-neon-cyan" : "text-gray-600"
                        )} 
                    />
                    <div className={clsx("w-1.5 h-1.5 rounded-full mt-1", connection[key as keyof typeof connection] ? "bg-neon-cyan shadow-[0_0_5px_#00FFFF]" : "bg-gray-600")} />
                </div>
            ))}
            <BackendStatusIndicator />
        </div>
        
        <div className="h-8 w-[1px] bg-gray-700 mx-2" />

        <div className="flex items-center space-x-2 text-neon-cyan">
            <Timer size={18} />
            <span className="text-xl font-mono font-bold tracking-widest">
                {formatTime(surgery.elapsedTime)}
            </span>
        </div>
      </div>
    </div>
  );
};
