import React from 'react';
import { Play, Layers, Crosshair } from 'lucide-react';
import { useStore } from '../../store';
import clsx from 'clsx';
import { motion } from 'framer-motion';

// 中间区域：展示当前场景卡片、执行入口和快捷场景。

export const CenterPanel: React.FC = () => {
  const { addLog } = useStore();

  const handleExecute = () => {
    addLog('执行场景: 肝段栓塞 - C臂工作位', 'info');
    setTimeout(() => addLog('设备运动中...', 'warning'), 500);
    setTimeout(() => addLog('场景就绪', 'success'), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-deep-space p-4 xl:p-6 2xl:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50" />
      
      {/* Active Scene Card */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-0">
        <div className="w-full max-w-[min(52rem,92%)] bg-gray-900/40 backdrop-blur-md rounded-2xl border border-gray-700 p-6 xl:p-8 2xl:p-10 shadow-2xl relative overflow-hidden">
            {/* Holographic scanning effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-neon-cyan/5 to-transparent animate-scan pointer-events-none" />
            
            <div className="text-center mb-6 xl:mb-8">
                <h2 className="text-sm xl:text-base font-bold text-neon-cyan tracking-[0.2em] uppercase mb-2">Active Scenario</h2>
                <h1 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold text-white leading-tight">场景 04: 肝段栓塞<br/><span className="text-gray-400 text-lg xl:text-xl 2xl:text-2xl">C-Arm Working Position</span></h1>
            </div>

            {/* Preview Area (Mock) */}
            <div className="h-48 xl:h-64 2xl:h-72 bg-black/50 rounded-lg border border-gray-700 mb-8 flex items-center justify-center relative">
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-20">
                    {[...Array(24)].map((_, i) => <div key={i} className="border border-neon-cyan/20" />)}
                </div>
                <Crosshair className="text-neon-cyan animate-spin-slow opacity-50 absolute" size={96} />
                <div className="text-gray-500 font-mono text-xs xl:text-sm">PREVIEW SIMULATION</div>
            </div>

            {/* Execute Button */}
            <div className="flex justify-center">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExecute}
                    className="w-28 h-28 xl:w-32 xl:h-32 2xl:w-36 2xl:h-36 rounded-full bg-neon-cyan/10 border-2 border-neon-cyan text-neon-cyan flex flex-col items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:bg-neon-cyan hover:text-black transition-all duration-300 group"
                >
                    <Play size={40} className="ml-1 fill-current" />
                    <span className="text-xs xl:text-sm font-bold mt-1">EXECUTE</span>
                </motion.button>
            </div>
        </div>

        {/* Step List */}
        <div className="mt-6 xl:mt-8 w-full max-w-[min(52rem,92%)] space-y-3">
            {[
                { step: 1, text: '床平移至坐标 X: 1200, Y: 400', status: 'done' },
                { step: 2, text: 'C臂旋转至 RAO 25°', status: 'active' },
                { step: 3, text: '无影灯色温调至 4300K', status: 'pending' },
            ].map((item) => (
                <div key={item.step} className={clsx(
                    "flex items-center p-3 xl:p-4 rounded border text-sm xl:text-base font-mono transition-colors",
                    item.status === 'active' ? "bg-neon-cyan/10 border-neon-cyan text-white" : 
                    item.status === 'done' ? "bg-gray-900/50 border-gray-800 text-gray-500" : "bg-transparent border-transparent text-gray-600"
                )}>
                    <div className={clsx("w-8 font-bold", item.status === 'active' ? "text-neon-cyan" : "text-gray-600")}>0{item.step}</div>
                    <div className="flex-1">{item.text}</div>
                    {item.status === 'active' && <div className="w-2 h-2 bg-neon-cyan rounded-full animate-ping" />}
                </div>
            ))}
        </div>
      </div>

      {/* Quick Scenarios */}
      <div className="h-24 xl:h-28 2xl:h-32 mt-auto flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
        {['体位复位', '穿刺位', '外科位', '撤离位'].map((label) => (
            <button key={label} className="min-w-[120px] xl:min-w-[150px] 2xl:min-w-[180px] h-full rounded-xl bg-gray-900/50 border border-gray-700 hover:border-neon-cyan hover:bg-neon-cyan/5 transition-all flex flex-col items-center justify-center group">
                <Layers size={22} className="text-gray-500 group-hover:text-neon-cyan mb-2" />
                <span className="text-sm xl:text-base font-bold text-gray-300 group-hover:text-white">{label}</span>
            </button>
        ))}
      </div>
    </div>
  );
};
