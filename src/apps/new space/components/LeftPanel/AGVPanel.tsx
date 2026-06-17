import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bot, Battery, Wifi } from 'lucide-react';
import { useNewSpaceStore } from '../../store';
import { setNewSpaceAGVMove, AGV_COMMANDS, AGVCommand } from '../../services/agvApi';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-1.5">
    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] shrink-0">{children}</h3>
    <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
  </div>
);

export default function AGVPanel() {
  const addToast = useNewSpaceStore((s) => s.pushToast);
  const [autoPositioning, setAutoPositioning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [loadingCommand, setLoadingCommand] = useState<AGVCommand | null>(null);
  const [speeds, setSpeeds] = useState<Record<AGVCommand, number>>({
    [AGV_COMMANDS.Stop]: 40,
    [AGV_COMMANDS.Go_Back]: 40,
    [AGV_COMMANDS.Go_Forward]: 40,
    [AGV_COMMANDS.Go_Left]: 40,
    [AGV_COMMANDS.Go_Right]: 40,
    [AGV_COMMANDS.Turn_Left]: 40,
    [AGV_COMMANDS.Turn_Right]: 40,
    [AGV_COMMANDS.Lift_Up]: 40,
    [AGV_COMMANDS.Lift_Down]: 40,
    [AGV_COMMANDS.AutoLocation]: 40,
  });

  const updateSpeed = (command: AGVCommand, value: number) => {
    setSpeeds((prev) => ({ ...prev, [command]: Math.max(0, value) }));
  };

  const handleMovement = async (command: AGVCommand) => {
    setLoadingCommand(command);
    try {
      const result = await setNewSpaceAGVMove(command, speeds[command]);
      if (result.ok) {
        addToast(`AGV ${getCommandName(command)} 已发送 (速度: ${speeds[command]})`, 'success');
      } else {
        addToast(`AGV ${getCommandName(command)} 失败：${result.error || '未知错误'}`, 'error');
      }
    } finally {
      setLoadingCommand(null);
    }
  };

  const handleStop = async () => {
    setLoadingCommand(AGV_COMMANDS.Stop);
    try {
      const result = await setNewSpaceAGVMove(AGV_COMMANDS.Stop, speeds[AGV_COMMANDS.Stop]);
      if (result.ok) {
        setStopped(true);
        setAutoPositioning(false);
        addToast('AGV已停止', 'warning');
      } else {
        addToast('AGV停止失败', 'error');
      }
    } finally {
      setLoadingCommand(null);
    }
  };

  const handleAutoPositioning = async () => {
    setAutoPositioning(true);
    setStopped(false);
    setLoadingCommand(AGV_COMMANDS.AutoLocation);
    
    try {
      const result = await setNewSpaceAGVMove(AGV_COMMANDS.AutoLocation, speeds[AGV_COMMANDS.AutoLocation]);
      if (result.ok) {
        addToast('AGV自动寻位已启动', 'success');
        
        setTimeout(() => {
          setAutoPositioning(false);
          addToast('AGV自动寻位完成', 'success');
        }, 3000);
      } else {
        addToast('AGV自动寻位失败', 'error');
        setAutoPositioning(false);
      }
    } finally {
      setLoadingCommand(null);
    }
  };

  const getCommandName = (command: AGVCommand): string => {
    const nameMap: Record<AGVCommand, string> = {
      [AGV_COMMANDS.Stop]: '停止',
      [AGV_COMMANDS.Go_Back]: '后退',
      [AGV_COMMANDS.Go_Forward]: '前进',
      [AGV_COMMANDS.Go_Left]: '左移',
      [AGV_COMMANDS.Go_Right]: '右移',
      [AGV_COMMANDS.Turn_Left]: '左旋',
      [AGV_COMMANDS.Turn_Right]: '右旋',
      [AGV_COMMANDS.Lift_Up]: '上升',
      [AGV_COMMANDS.Lift_Down]: '下降',
      [AGV_COMMANDS.AutoLocation]: '自动寻位'
    };
    return nameMap[command] || command;
  };

  const isButtonDisabled = loadingCommand !== null;

  return (
    <div className="overflow-y-auto px-4 py-2 space-y-3">
      <SectionTitle>设备状态</SectionTitle>
      <div className="rounded-xl border border-teal-500/30 bg-gradient-to-br from-gray-900/60 to-gray-950/70 p-3 space-y-2 backdrop-blur-sm shadow-lg shadow-teal-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-teal-400" />
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">AGV 小车</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold ${stopped ? 'bg-red-500/20 text-red-300 border border-red-500/30' : autoPositioning ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${stopped ? 'bg-red-400' : autoPositioning ? 'bg-emerald-400 animate-pulse' : 'bg-teal-400'}`} />
            {stopped ? '已停止' : autoPositioning ? '寻位中' : '就绪'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
            <div className="flex items-center gap-1 mb-1">
              <Battery className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] text-gray-400">电量</span>
            </div>
            <span className="text-[12px] font-bold text-white">87%</span>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
            <div className="flex items-center gap-1 mb-1">
              <Wifi className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] text-gray-400">信号</span>
            </div>
            <span className="text-[12px] font-bold text-white">强</span>
          </div>
        </div>
      </div>

      <SectionTitle>运动控制</SectionTitle>
      <div className="rounded-xl border border-teal-500/30 bg-gradient-to-br from-gray-900/60 to-gray-950/70 p-3 backdrop-blur-sm shadow-lg shadow-teal-500/10">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleMovement(AGV_COMMANDS.Go_Left)}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              左移
            </button>
            <button
              onClick={() => handleMovement(AGV_COMMANDS.Go_Forward)}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              前进
            </button>
            <button
              onClick={() => handleMovement(AGV_COMMANDS.Go_Right)}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              右移
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleMovement(AGV_COMMANDS.Turn_Left)}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              左旋
            </button>
            <button
              onClick={() => handleMovement(AGV_COMMANDS.Go_Back)}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              后退
            </button>
            <button
              onClick={() => handleMovement(AGV_COMMANDS.Turn_Right)}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              右旋
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleMovement(AGV_COMMANDS.Lift_Up)}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              上升
            </button>
            <button
              onClick={handleStop}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-green-600/80 bg-green-700/40 hover:bg-green-700/50 text-green-100 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] shadow-lg ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              停止
            </button>
            <button
              onClick={() => handleMovement(AGV_COMMANDS.Lift_Down)}
              disabled={isButtonDisabled}
              className={`h-10 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 font-bold text-[11px] transition-all duration-200 active:scale-[0.95] ${isButtonDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              下降
            </button>
          </div>

          <button
            onClick={handleAutoPositioning}
            disabled={autoPositioning || isButtonDisabled}
            className={`w-full h-12 rounded-lg border font-bold text-[12px] transition-all duration-200 active:scale-[0.98] ${
              autoPositioning || isButtonDisabled
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 cursor-not-allowed animate-pulse'
                : 'border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200'
            }`}
          >
            床机自动寻位
          </button>
        </div>

        {autoPositioning && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] text-emerald-300 font-medium">正在执行自动定位...</span>
            </div>
            <div className="h-1 bg-emerald-900/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {loadingCommand && !autoPositioning && (
          <div className="flex items-center justify-center gap-2 py-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <span className="text-[10px] text-blue-300 font-medium">正在发送命令...</span>
          </div>
        )}
      </div>

      <SectionTitle>速度设置</SectionTitle>
      <div className="rounded-xl border border-teal-500/30 bg-gradient-to-br from-gray-900/60 to-gray-950/70 p-3 backdrop-blur-sm shadow-lg shadow-teal-500/10">
        <div className="space-y-1.5">
          {[
            { command: AGV_COMMANDS.Go_Left, label: '左移速度', unit: 'mm' },
            { command: AGV_COMMANDS.Go_Forward, label: '前进速度', unit: 'mm' },
            { command: AGV_COMMANDS.Go_Right, label: '右移速度', unit: 'mm' },
            { command: AGV_COMMANDS.Turn_Left, label: '左旋速度', unit: '°' },
            { command: AGV_COMMANDS.Go_Back, label: '后退速度', unit: 'mm' },
            { command: AGV_COMMANDS.Turn_Right, label: '右旋速度', unit: '°' },
            { command: AGV_COMMANDS.Lift_Up, label: '上升速度', unit: 'mm' },
            { command: AGV_COMMANDS.Lift_Down, label: '下降速度', unit: 'mm' },
            { command: AGV_COMMANDS.AutoLocation, label: '自动寻位速度', unit: 'mm' },
          ].map(({ command, label, unit }) => (
            <div key={command} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-300 font-medium min-w-[72px] shrink-0">{label}</span>
              <div className="flex-1 h-1 bg-gray-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500/60 to-blue-400/80 transition-all duration-200"
                  style={{ width: `${Math.min((speeds[command] / 100) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={speeds[command]}
                  onChange={(e) => updateSpeed(command, Number(e.target.value) || 0)}
                  className="w-12 h-5 px-1.5 rounded border border-gray-700/80 bg-gray-950/80 text-[9px] font-mono text-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition-all text-center"
                />
                <span className="text-[8px] text-gray-500 w-3">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}