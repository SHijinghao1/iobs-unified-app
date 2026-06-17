/**
 * @file RightSidebar.tsx
 * @description 手术室应用右侧边栏组件，包含姿态预设和快捷操作
 * @author IOBS Team
 * @date 2024-01-01
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { ChevronRight, Target, Bed, Accessibility, Activity, Move, BrainCircuit, Maximize2, Settings2, ChevronLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import PositionsPresetBridge from './LeftPanel/PositionsPresetBridge';
import ScenePreview from './ScenePreview';

interface RightSidebarProps {
  activeCenterView: string | null;
  setActiveCenterView: (view: string | null) => void;
}

export default function RightSidebar({ activeCenterView, setActiveCenterView }: RightSidebarProps) {
  const [rightPanelMode, setRightPanelMode] = useState<'main' | 'positions'>('main');
  const [beamRestrictorActive, setBeamRestrictorActive] = useState(false);
  const [beamCoords, setBeamCoords] = useState({ p1x: -0.15, p1y: -0.15, p2x: 0.15, p2y: -0.15, p3x: -0.15, p3y: 0.15, p4x: 0.15, p4y: 0.15 });
  const [demoActive, setDemoActive] = useState(false);
  const demoFrameRef = useRef<number | null>(null);
  const demoStartRef = useRef<{ coords: typeof beamCoords; time: number } | null>(null);

  // 演示动画：每个动作独立，做完复位再做下一个（含长方形变形）
  useEffect(() => {
    if (!demoActive) return;

    const base = { ...beamCoords };
    const startTime = performance.now();
    const phaseDur = 3000; // 每阶段3s（更慢）
    
    const phases: Array<string> = [
      'scaleUp', 'scaleDown', 'reset',
      'moveLeft', 'reset', 'moveRight', 'reset',
      'moveDown', 'reset', 'moveUp', 'reset',
      'stretchLeft', 'reset',
      'stretchRight', 'reset',
      'stretchBottom', 'reset',
      'stretchTop', 'reset',
      'stretchWide', 'reset',
      'stretchTall', 'reset',
    ];
    const totalDur = phaseDur * phases.length;

    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const STRETCH = 0.08;

    function getResetCoords(prevAction: string, pt: number): typeof base {
      if (prevAction === 'scaleDown') {
        const s = 0.55 + pt * 0.45;
        return { p1x: base.p1x*s, p1y: base.p1y*s, p2x: base.p2x*s, p2y: base.p2y*s, p3x: base.p3x*s, p3y: base.p3y*s, p4x: base.p4x*s, p4y: base.p4y*s };
      }
      if (prevAction === 'moveLeft') { const off = -STRETCH*2*(1-pt); return { p1x:base.p1x+off,p1y:base.p1y,p2x:base.p2x+off,p2y:base.p2y,p3x:base.p3x+off,p3y:base.p3y,p4x:base.p4x+off,p4y:base.p4y }; }
      if (prevAction === 'moveRight') { const off = STRETCH*2*(1-pt); return { p1x:base.p1x+off,p1y:base.p1y,p2x:base.p2x+off,p2y:base.p2y,p3x:base.p3x+off,p3y:base.p3y,p4x:base.p4x+off,p4y:base.p4y }; }
      if (prevAction === 'moveDown') { const off = -STRETCH*2*(1-pt); return { p1x:base.p1x,p1y:base.p1y+off,p2x:base.p2x,p2y:base.p2y+off,p3x:base.p3x,p3y:base.p3y+off,p4x:base.p4x,p4y:base.p4y+off }; }
      if (prevAction === 'moveUp') { const off = STRETCH*2*(1-pt); return { p1x:base.p1x,p1y:base.p1y+off,p2x:base.p2x,p2y:base.p2y+off,p3x:base.p3x,p3y:base.p3y+off,p4x:base.p4x,p4y:base.p4y+off }; }
      if (prevAction === 'stretchLeft') { const off = -STRETCH*(1-pt); return { ...base, p1x:base.p1x+off, p3x:base.p3x+off }; }
      if (prevAction === 'stretchRight') { const off = STRETCH*(1-pt); return { ...base, p2x:base.p2x+off, p4x:base.p4x+off }; }
      if (prevAction === 'stretchBottom') { const off = -STRETCH*(1-pt); return { ...base, p1y:base.p1y+off, p2y:base.p2y+off }; }
      if (prevAction === 'stretchTop') { const off = STRETCH*(1-pt); return { ...base, p3y:base.p3y+off, p4y:base.p4y+off }; }
      if (prevAction === 'stretchWide') { const off = STRETCH*(1-pt); return { ...base, p1x:base.p1x-off, p2x:base.p2x+off, p3x:base.p3x-off, p4x:base.p4x+off }; }
      if (prevAction === 'stretchTall') { const off = STRETCH*(1-pt); return { ...base, p1y:base.p1y-off, p2y:base.p2y-off, p3y:base.p3y+off, p4y:base.p4y+off }; }
      return base;
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      if (elapsed >= totalDur) { setBeamCoords({ p1x: -0.28, p1y: -0.28, p2x: 0.28, p2y: -0.28, p3x: -0.28, p3y: 0.28, p4x: 0.28, p4y: 0.28 }); setDemoActive(false); return; }

      const phaseIdx = Math.floor(elapsed / phaseDur);
      const pt = easeInOut((elapsed % phaseDur) / phaseDur);
      const action = phases[phaseIdx];
      let next: typeof base;

      switch (action) {
        case 'scaleUp': { const s=1+pt*0.25; next={p1x:base.p1x*s,p1y:base.p1y*s,p2x:base.p2x*s,p2y:base.p2y*s,p3x:base.p3x*s,p3y:base.p3y*s,p4x:base.p4x*s,p4y:base.p4y*s}; break; }
        case 'scaleDown': { const maxS=1.25,s=maxS-pt*(maxS-0.55); next={p1x:base.p1x*s,p1y:base.p1y*s,p2x:base.p2x*s,p2y:base.p2y*s,p3x:base.p3x*s,p3y:base.p3y*s,p4x:base.p4x*s,p4y:base.p4y*s}; break; }
        case 'reset': next=getResetCoords(phases[phaseIdx>0?phaseIdx-1:0],pt); break;
        case 'moveLeft': { const off=-pt*STRETCH*2; next={p1x:base.p1x+off,p1y:base.p1y,p2x:base.p2x+off,p2y:base.p2y,p3x:base.p3x+off,p3y:base.p3y,p4x:base.p4x+off,p4y:base.p4y}; break; }
        case 'moveRight': { const off=pt*STRETCH*2; next={p1x:base.p1x+off,p1y:base.p1y,p2x:base.p2x+off,p2y:base.p2y,p3x:base.p3x+off,p3y:base.p3y,p4x:base.p4x+off,p4y:base.p4y}; break; }
        case 'moveDown': { const off=-pt*STRETCH*2; next={p1x:base.p1x,p1y:base.p1y+off,p2x:base.p2x,p2y:base.p2y+off,p3x:base.p3x,p3y:base.p3y+off,p4x:base.p4x,p4y:base.p4y+off}; break; }
        case 'moveUp': { const off=pt*STRETCH*2; next={p1x:base.p1x,p1y:base.p1y+off,p2x:base.p2x,p2y:base.p2y+off,p3x:base.p3x,p3y:base.p3y+off,p4x:base.p4x,p4y:base.p4y+off}; break; }
        case 'stretchLeft': next={...base,p1x:base.p1x-pt*STRETCH,p3x:base.p3x-pt*STRETCH}; break;
        case 'stretchRight': next={...base,p2x:base.p2x+pt*STRETCH,p4x:base.p4x+pt*STRETCH}; break;
        case 'stretchBottom': next={...base,p1y:base.p1y-pt*STRETCH,p2y:base.p2y-pt*STRETCH}; break;
        case 'stretchTop': next={...base,p3y:base.p3y+pt*STRETCH,p4y:base.p4y+pt*STRETCH}; break;
        case 'stretchWide': next={...base,p1x:base.p1x-pt*STRETCH,p2x:base.p2x+pt*STRETCH,p3x:base.p3x-pt*STRETCH,p4x:base.p4x+pt*STRETCH}; break;
        case 'stretchTall': next={...base,p1y:base.p1y-pt*STRETCH,p2y:base.p2y-pt*STRETCH,p3y:base.p3y+pt*STRETCH,p4y:base.p4y+pt*STRETCH}; break;
        default: next=base;
      }

      setBeamCoords(next);
      demoFrameRef.current=requestAnimationFrame(animate);
    }

    demoFrameRef.current=requestAnimationFrame(animate);
    return()=>{if(demoFrameRef.current)cancelAnimationFrame(demoFrameRef.current);};
  },[demoActive]);

  const toggleDemo = useCallback(() => {
    if (!demoActive) setDemoActive(true);
  }, [demoActive]);

  if (activeCenterView) return null;

  return (
    <motion.aside
      key="right-sidebar"
      initial={{ opacity: 0, x: 80, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 80, filter: 'blur(10px)' }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      layout
      className="w-full h-full px-[0.5vw] py-[0.8vw] flex flex-col overflow-hidden relative"
    >
      <AnimatePresence mode="wait">
        {rightPanelMode === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full overflow-y-auto space-y-1.5 custom-scrollbar"
          >
            <div className="bg-[#162638]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-lg p-2.5 shrink-0">
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-semibold tracking-wider text-white/80 uppercase">运动进度</span>
                  <span className="text-sm font-bold text-teal-400 tabular-nums">75%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-teal-500/60 via-teal-400 to-cyan-400/60 rounded-full shadow-[0_0_12px_rgba(14,211,165,0.4)]"
                  />
                </div>

                <div className="pt-1.5 border-t border-white/[0.06] relative">
                  <Target className="absolute top-1.5 right-0 w-2.5 h-2.5 text-teal-400/20" />
                  <span className="text-[10px] text-white/80 font-medium uppercase tracking-wider block mb-0.5">ETA 预计完成时间</span>
                  <span className="text-base font-mono text-white font-bold tracking-tight">00:12</span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-1.5">
            <div className="bg-[#162638]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-lg p-3 flex flex-col flex-[0.55] min-h-0 overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-teal-400" />
                  <h3 className="text-[13px] font-bold text-white/90 tracking-wide">姿态预设</h3>
                </div>
                <button 
                  onClick={() => setRightPanelMode('positions')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 text-slate-400 hover:text-teal-400 transition-all group/more"
                >
                  <span className="text-[10px] font-semibold tracking-wide">更多</span>
                  <ChevronRight className="w-3 h-3 group-hover/more:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="space-y-1.5">
                {[
                  { label: '标准平卧', icon: Bed, sub: 'Standard' },
                  { label: '头低脚高', icon: Accessibility, sub: 'Trendelenburg' },
                  { label: '侧卧侧偏', icon: Activity, sub: 'Lateral' },
                ].map((item) => (
                  <div key={item.label} className="h-10 bg-[#0f1924]/60 border border-white/[0.06] rounded-lg flex items-center px-3 gap-2.5 group hover:border-teal-500/30 hover:bg-teal-500/[0.04] transition-all cursor-pointer relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-teal-500/50 rounded-r-full transition-all duration-300"></div>

                    <div className="w-7 h-7 rounded-md bg-[#0a1018] border border-white/[0.06] flex items-center justify-center text-slate-500 group-hover:text-teal-400 group-hover:border-teal-500/25 transition-all">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-slate-300 group-hover:text-white transition-colors truncate">{item.label}</div>
                    </div>

                    <button className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-[9px] font-semibold rounded-md transition-all active:scale-95 uppercase tracking-wider">
                      调用
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#162638]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-lg p-3 flex flex-col flex-[1] min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-2.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  {beamRestrictorActive ? (
                    <Target className="w-4 h-4 text-teal-400" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  )}
                  <h3 className="text-xs font-bold text-white/90 tracking-wide shrink-0">
                    {beamRestrictorActive ? '束光器模式' : '防碰撞保护'}
                  </h3>
                  {beamRestrictorActive && (() => {
                    const DISPLAY_SCALE = 100;
                    const MAX_EXTENT = 28; // 显示用（实际值 * 100）
                    const REAL_MAX = 0.28;
                    const clamp = (v: number) => Math.max(-REAL_MAX, Math.min(REAL_MAX, v));
                    return (
                    <>
                    <div className="flex items-center gap-1 ml-1 text-[8px] font-mono flex-wrap">
                      {['p1', 'p2', 'p3', 'p4'].map((p, i) => {
                        // 井字关系：左x= p1x/p3x联动，右x= p2x/p4x联动，下y= p1y/p2y联动，上y= p3y/p4y联动
                        const xLink = p === 'p1' ? 'p3' : p === 'p3' ? 'p1' : p === 'p2' ? 'p4' : 'p2';
                        const yLink = p === 'p1' ? 'p2' : p === 'p2' ? 'p1' : p === 'p3' ? 'p4' : 'p3';
                        return (
                        <div key={p} className="flex items-center gap-0.5 shrink-0">
                          <span className="text-teal-400/70">{i + 1}:</span>
                          <span className="text-teal-300/50">(</span>
                          <input
                            type="number"
                            step="0.1"
                            min={-MAX_EXTENT}
                            max={MAX_EXTENT}
                            value={String(Math.round(beamCoords[`${p}x` as keyof typeof beamCoords] * DISPLAY_SCALE))}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '' || raw === '-') {
                                setBeamCoords({ ...beamCoords, [`${p}x`]: 0, [`${xLink}x`]: 0 });
                              } else {
                                const v = clamp(parseFloat(raw) / DISPLAY_SCALE);
                                if (!isNaN(v)) setBeamCoords({ ...beamCoords, [`${p}x`]: v, [`${xLink}x`]: v });
                              }
                            }}
                            className="w-8 px-0.5 py-0 rounded bg-[#0f1924] border border-white/10 text-teal-300 text-[8px] font-mono focus:outline-none focus:border-teal-500/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-teal-300/50">,</span>
                          <input
                            type="number"
                            step="0.1"
                            min={-MAX_EXTENT}
                            max={MAX_EXTENT}
                            value={String(Math.round(beamCoords[`${p}y` as keyof typeof beamCoords] * DISPLAY_SCALE))}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '' || raw === '-') {
                                setBeamCoords({ ...beamCoords, [`${p}y`]: 0, [`${yLink}y`]: 0 });
                              } else {
                                const v = clamp(parseFloat(raw) / DISPLAY_SCALE);
                                if (!isNaN(v)) setBeamCoords({ ...beamCoords, [`${p}y`]: v, [`${yLink}y`]: v });
                              }
                            }}
                            className="w-8 px-0.5 py-0 rounded bg-[#0f1924] border border-white/10 text-teal-300 text-[8px] font-mono focus:outline-none focus:border-teal-500/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-teal-300/50">)</span>
                        </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={toggleDemo}
                      disabled={demoActive}
                      className={`px-2 py-0.5 rounded border text-[9px] font-semibold transition-all active:scale-95 shrink-0 ${
                        demoActive
                          ? 'bg-teal-500/25 border-teal-500/50 text-teal-300 cursor-wait'
                          : 'bg-teal-500/15 border-teal-500/30 text-teal-400 hover:bg-teal-500/25 hover:border-teal-500/50'
                      }`}
                    >
                      演示
                    </button>
                    </>
                    );
                  })()}
                </div>
                {!beamRestrictorActive && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    <span className="text-[9px] font-bold text-emerald-400">已启用</span>
                  </div>
                )}
              </div>

              <div className="flex-1 relative rounded-xl overflow-hidden border border-white/[0.06] mb-3 group">
                <ScenePreview hideModels={beamRestrictorActive} beamCoords={beamCoords} />
                {!beamRestrictorActive && (
                  <div className="absolute top-2 left-2 w-10 h-10 rounded-xl bg-emerald-500/15 backdrop-blur-md border border-emerald-500/25 flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.15)] z-10">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#162638]/50 via-transparent to-transparent pointer-events-none z-10" />
              </div>

              <div className="shrink-0 flex gap-2">
                <button
                  onClick={() => setBeamRestrictorActive(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 text-[10px] font-semibold transition-all active:scale-95"
                >
                  <ShieldCheck className="w-3 h-3" />
                  防碰撞检测
                </button>
                <button
                  onClick={() => setBeamRestrictorActive(!beamRestrictorActive)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-semibold transition-all active:scale-95 ${
                    beamRestrictorActive
                      ? 'bg-teal-500/25 border-teal-500/50 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                      : 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/25 hover:border-teal-500/40 text-teal-400 hover:text-teal-300'
                  }`}
                >
                  <Target className="w-3 h-3" />
                  束光器
                </button>
              </div>
            </div>
            </div>
          </motion.div>
        )}

        {rightPanelMode === 'positions' && (
          <motion.div
            key="positions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col h-full overflow-hidden bg-[#162638]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <button
                onClick={() => setRightPanelMode('main')}
                className="flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[12px] font-semibold uppercase tracking-wide">返回</span>
              </button>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">完整姿态库</h3>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <PositionsPresetBridge />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
