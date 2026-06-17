/**
 * @file LeftPanel.tsx
 * @description 手术室应用左侧面板组件，包含仪表板、C臂控制和姿态预设视图
 * @author IOBS Team
 * @date 2024-01-01
 */

import { motion, AnimatePresence } from 'motion/react';

import { ChevronLeft } from 'lucide-react';

import DashboardView from './LeftPanel/DashboardView';
import CArmPanel from './LeftPanel/CArmPanel';
import AGVPanel from './LeftPanel/AGVPanel';
import PositionsView from './LeftPanel/PositionsView';

interface LeftPanelProps {
  activeCenterView: string | null;
  leftPanelMode: 'dashboard' | 'carm' | 'positions' | 'agv';
  setLeftPanelMode: (mode: 'dashboard' | 'carm' | 'positions' | 'agv') => void;
}

export default function LeftPanel({ activeCenterView, leftPanelMode, setLeftPanelMode }: LeftPanelProps) {
  if (activeCenterView) return null;

  return (
    <motion.aside
      key="left-sidebar"
      initial={{ opacity: 0, x: -80, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: -80, filter: 'blur(10px)' }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      layout
      className="w-full h-full px-[0.6vw] py-[1vw] flex flex-col gap-[0.6vh] overflow-hidden relative"
    >
      <AnimatePresence mode="wait">
        {leftPanelMode === 'dashboard' && (
          <DashboardView key="dashboard" setLeftPanelMode={setLeftPanelMode} />
        )}
        {leftPanelMode === 'positions' && (
          <motion.div
            key="positions"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col h-full bg-[#162638]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-2"
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/8 shrink-0">
              <button
                onClick={() => setLeftPanelMode('dashboard')}
                className="flex items-center gap-2 text-slate-400 hover:text-medical-teal transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-[12px] font-black uppercase tracking-widest">返回主界面</span>
              </button>
              <span className="text-[12px] font-black text-white tracking-[0.2em] uppercase">姿态预设</span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <PositionsView setLeftPanelMode={setLeftPanelMode} />
            </div>
          </motion.div>
        )}
        {leftPanelMode === 'carm' && (
          <motion.div
            key="carm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col h-full bg-[#162638]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-2"
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/8 shrink-0">
              <button
                onClick={() => setLeftPanelMode('dashboard')}
                className="flex items-center gap-2 text-slate-400 hover:text-medical-teal transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-[12px] font-black uppercase tracking-widest">返回主界面</span>
              </button>
              <span className="text-[12px] font-black text-white tracking-[0.2em] uppercase">影像 C-ARM 系统</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <CArmPanel />
            </div>
          </motion.div>
        )}
        {leftPanelMode === 'agv' && (
          <motion.div
            key="agv"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col h-full bg-[#162638]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-2"
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/8 shrink-0">
              <button
                onClick={() => setLeftPanelMode('dashboard')}
                className="flex items-center gap-2 text-slate-400 hover:text-medical-teal transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-[12px] font-black uppercase tracking-widest">返回主界面</span>
              </button>
              <span className="text-[12px] font-black text-white tracking-[0.2em] uppercase">AGV 小车系统</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AGVPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
