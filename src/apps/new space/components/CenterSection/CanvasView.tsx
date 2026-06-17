import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Unlock, RefreshCw, ChevronRight, RotateCcw, BedDouble } from 'lucide-react';
import ThreeScenePanel from '../ThreeScenePanel';
import { useNewSpaceStore } from '../../store';
import { setNewSpaceAGVMove, AGV_COMMANDS } from '../../services/agvApi';

interface CanvasViewProps {
  setLeftPanelMode: (mode: 'dashboard' | 'positions' | 'carm' | 'agv') => void;
}

export default function CanvasView({ setLeftPanelMode }: CanvasViewProps) {
  const locked = useNewSpaceStore((s) => s.sceneLocked);
  const setLocked = useNewSpaceStore((s) => s.setSceneLocked);
  const applyPresetById = useNewSpaceStore((s) => s.applyPresetById);
  const addToast = useNewSpaceStore((s) => s.pushToast);
  const bedStateName = useNewSpaceStore((s) => s.bedStateName);
  const bedStateProgress = useNewSpaceStore((s) => s.bedStateProgress);
  const [agvAutoPositioning, setAgvAutoPositioning] = useState(false);

  const handleAGVAutoPositioning = async () => {
    setAgvAutoPositioning(true);
    try {
      const result = await setNewSpaceAGVMove(AGV_COMMANDS.AutoLocation, 40);
      if (result.ok) {
        addToast('AGV自动寻位已启动', 'success');
        setTimeout(() => {
          setAgvAutoPositioning(false);
          addToast('AGV自动寻位完成', 'success');
        }, 3000);
      } else {
        addToast('AGV自动寻位失败：' + (result.error || '未知错误'), 'error');
        setAgvAutoPositioning(false);
      }
    } catch (error) {
      addToast('AGV自动寻位失败', 'error');
      setAgvAutoPositioning(false);
    }
  };

  const handleAGVStop = async () => {
    setAgvAutoPositioning(false);
    try {
      const result = await setNewSpaceAGVMove(AGV_COMMANDS.Stop, 40);
      if (result.ok) {
        addToast('AGV已停止', 'warning');
      } else {
        addToast('AGV停止失败：' + (result.error || '未知错误'), 'error');
      }
    } catch (error) {
      addToast('AGV停止失败', 'error');
    }
  };

  return (
    <motion.div
      key="canvas"
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.3 }}
      className="flex-1 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(110,231,213,0.08),transparent_28%)] pointer-events-none z-0" />

      <div className="absolute inset-0 z-10">
        <ThreeScenePanel />
      </div>

      <div className="absolute top-[calc(8vh+2vh)] left-[55%] -translate-x-1/2 flex gap-[0.8vw] z-20">
        <div className="flex gap-1 p-[6px] rounded-[20px] bg-[#1a2942]/90 backdrop-blur-3xl border border-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <button
            onClick={() => setLocked(true)}
            style={locked ? { background: 'linear-gradient(135deg,#3df5e0 0%,#00e5cc 45%,#00c2ab 100%)', boxShadow: '0 0 20px rgba(0,229,204,0.4), 0 0 40px rgba(0,229,204,0.15)' } : {}}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] transition-all duration-300 relative overflow-hidden ${locked ? 'text-[#061a18] font-black' : 'text-blue-300 hover:text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40'}`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span className="font-bold tracking-wider uppercase text-[12px]">锁定</span>
          </button>
          <button
            onClick={() => setLocked(false)}
            style={!locked ? { background: 'linear-gradient(135deg,#3df5e0 0%,#00e5cc 45%,#00c2ab 100%)', boxShadow: '0 0 20px rgba(0,229,204,0.4), 0 0 40px rgba(0,229,204,0.15)' } : {}}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] transition-all duration-300 relative overflow-hidden ${!locked ? 'text-[#061a18] font-black' : 'text-orange-300 hover:text-orange-200 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40'}`}
          >
            <Unlock className="w-4 h-4 shrink-0" />
            <span className="font-bold tracking-wider uppercase text-[12px]">解锁</span>
          </button>
        </div>

        <button
          onClick={() => applyPresetById('zero')}
          className="flex items-center justify-center gap-3 px-6 py-3 rounded-[16px] text-emerald-300 hover:text-emerald-200 bg-[#1a2942]/90 backdrop-blur-3xl border border-white/5 hover:border-emerald-500/40 shadow-[0_24px_60px_rgba(0,0,0,0.45)] hover:bg-emerald-500/10 transition-all group"
        >
          <RotateCcw className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:-rotate-45 transition-all duration-300" />
          <span className="font-bold tracking-widest uppercase text-[12px]">一键复位</span>
        </button>

        {/* 状态条已移至顶部导航栏 */}
        {/* <div className="flex items-center gap-3 px-5 py-3 rounded-[16px] bg-[#1a2942]/90 backdrop-blur-3xl border border-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] min-w-[350px]">
          <div className={`w-3 h-3 rounded-full shrink-0 animate-pulse ${bedStateProgress === 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'}`} />
          <div className="overflow-hidden flex-1 relative h-[28px]">
            <div className="flex animate-marquee whitespace-nowrap absolute">
              <span className="text-[20px] text-slate-300 font-medium mx-8">{bedStateName || '等待后端数据...'}</span>
              <span className="text-[20px] text-slate-300 font-medium mx-8">{bedStateName || '等待后端数据...'}</span>
            </div>
          </div>
        </div> */}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(9vh+2vh)] z-20 flex items-stretch gap-7">
        <div className="bg-[#1a2942]/85 backdrop-blur-2xl border border-white/5 rounded-2xl px-4 py-3 shadow-2xl relative overflow-hidden transition-all w-[28vw] min-w-[320px]">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-medical-teal to-medical-teal/50 opacity-70 rounded-l-2xl" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">联动设备</span>
                  <span className="text-[15px] font-bold text-white mt-0.5">AGV 小车</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                <button
                  onClick={handleAGVAutoPositioning}
                  disabled={agvAutoPositioning}
                  className={`px-3 py-1.5 border rounded-lg text-[11px] font-semibold transition-all active:scale-[0.96] ${
                    agvAutoPositioning
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 cursor-not-allowed animate-pulse'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  自动寻位
                </button>
                <button
                  onClick={handleAGVStop}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 hover:text-red-300 transition-all active:scale-[0.96] text-[11px] font-semibold"
                >
                  停止
                </button>
                <button
                  onClick={() => setLeftPanelMode('agv')}
                  className="px-3 py-1.5 bg-white/5 hover:bg-medical-teal/10 border border-white/10 hover:border-medical-teal/30 rounded-lg flex items-center gap-1 text-slate-400 hover:text-medical-teal transition-all active:scale-[0.96] group/agv text-[11px] font-semibold"
                >
                  更多
                  <ChevronRight className="w-3.5 h-3.5 group-hover/agv:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden relative">
                <motion.div
                  animate={{ width: '65%' }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-teal-500/50 via-teal-400 to-teal-500/60 shadow-[0_0_8px_rgba(14,211,165,0.4)]"
                />
              </div>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[9px] text-slate-500 font-medium">已联动：影像设备、导航系统</span>
                <span className="text-[9px] text-medical-teal font-bold">65%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a2942]/85 backdrop-blur-2xl border border-white/5 rounded-2xl px-6 py-3 flex items-center justify-between shadow-2xl relative overflow-hidden transition-all min-w-[220px]">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-medical-teal to-medical-teal/50 opacity-70 rounded-l-2xl" />
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">联动设备</span>
              <span className="text-base font-bold text-white mt-1 truncate">影像 C-ARM</span>
            </div>
            <div className="w-[1px] h-10 bg-white/10 shrink-0" />
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">联动状态</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-medical-teal animate-pulse shadow-[0_0_8px_#29e3cc]" />
                <span className="text-sm font-black text-medical-teal tracking-widest uppercase">ACTIVE</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setLeftPanelMode('carm')}
            className="ml-4 px-4 py-2 bg-white/5 hover:bg-medical-teal/10 border border-white/10 hover:border-medical-teal/30 rounded-xl flex items-center gap-2 text-slate-400 hover:text-medical-teal transition-all active:scale-[0.98] group/more shrink-0"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider">更多</span>
            <ChevronRight className="w-4 h-4 group-hover/more:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
