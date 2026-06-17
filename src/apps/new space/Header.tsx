/**
 * @file Header.tsx
 * @description 手术室应用顶部导航栏
 */

import { useState, useEffect } from 'react';

import { Bed, User, Bookmark, Shield, Settings, Bluetooth, Wifi, Signal } from 'lucide-react';

import { motion } from 'motion/react';

import { useNewSpaceStore } from './store';

const navItems = [
  { id: 'control', label: '手术床控制', icon: Bed, active: true },
  { id: 'position', label: '体位管理', icon: User, active: false },
  { id: 'memory', label: '记忆体位', icon: Bookmark, active: false },
  { id: 'linkage', label: '设备联动', icon: Shield, active: false },
  { id: 'settings', label: '设置', icon: Settings, active: false },
];

export default function Header() {
  const [time, setTime] = useState(new Date());
  const backendConnectionStatus = useNewSpaceStore((s) => s.backendConnectionStatus);
  const isConnected = backendConnectionStatus === 'connected';
  const statusColor = isConnected ? 'text-emerald-400' : 'text-red-400';
  const bedStateName = useNewSpaceStore((s) => s.bedStateName);
  const bedStateProgress = useNewSpaceStore((s) => s.bedStateProgress);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

  return (
    <header className="min-h-[8vh] px-[1.5vw] py-1vh flex items-center justify-between gap-4">
      {/* 左侧：品牌 + 标题 */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-2xl font-bold text-teal-400 tracking-wide whitespace-nowrap">Intelligent medical</span>
        <span className="text-xl font-medium text-white/90 whitespace-nowrap">手术床控制</span>
      </div>

      {/* 中间：导航按钮 + 状态显示 */}
      <nav className="flex items-center gap-3 flex-1 justify-center">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2.5 px-4 py-1.5 rounded-lg text-[16px] font-semibold transition-all duration-200 ${
              item.active
                ? 'bg-teal-500/20 border border-teal-500/40 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.2)]'
                : 'text-slate-400 hover:text-white/80'
            }`}
          >
            <item.icon className={`w-5 h-5 ${item.active ? 'text-teal-400' : ''}`} />
            <span className="whitespace-nowrap">{item.label}</span>
          </motion.button>
        ))}

        {/* 床状态显示（设置按钮后面） */}
        <div className="flex items-center gap-3 px-6 py-2 rounded-md bg-[#1a2942]/80 backdrop-blur-md border border-white/5 ml-8 min-w-[280px] overflow-hidden">
          <div className={`w-4 h-4 rounded-full shrink-0 animate-pulse ${bedStateProgress === 100 ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'}`} />
          <div className="overflow-hidden flex-1 relative h-[22px]">
            <div className="flex animate-marquee whitespace-nowrap absolute">
              <span className="text-lg text-slate-300 font-medium px-8">{bedStateName || '等待后端数据...'}</span>
              <span className="text-lg text-slate-300 font-medium px-8">{bedStateName || '等待后端数据...'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* 右侧：状态图标 + 时间 */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 状态图标 */}
        <Bluetooth className="w-5 h-5 text-teal-400 shrink-0" />
        <Wifi className={`w-5 h-5 ${statusColor} shrink-0`} />
        <Signal className="w-5 h-5 text-slate-400 shrink-0" />

        {/* 时间 */}
        <div className="flex flex-col items-end">
          <span className="text-lg font-semibold text-white/90 tabular-nums leading-tight">{timeStr}</span>
          <span className="text-xs text-slate-500 tabular-nums leading-tight">{dateStr}</span>
        </div>
      </div>
    </header>
  );
}
