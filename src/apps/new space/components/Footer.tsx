/**
 * @file Footer.tsx
 * @description 手术室应用底部组件，包含紧急制动按钮和功能切换按钮
 * @author IOBS Team
 * @date 2024-01-01
 */

import { ArrowRightLeft, RefreshCw, Settings2, FileText, Users } from 'lucide-react';

import { useNewSpaceStore } from '../store';

interface FooterProps {
  activeCenterView: string | null;
  setActiveCenterView: (view: string | null) => void;
}

export default function Footer({ activeCenterView, setActiveCenterView }: FooterProps) {
  const { emergencyStopping, sendEmergencyStop } = useNewSpaceStore();
  
  return (
    <footer className="min-h-[8vh] px-[1.2vw] py-[0.6vh] flex items-center gap-2.5">
      <button 
        onClick={sendEmergencyStop}
        disabled={emergencyStopping}
        className="w-[14%] min-w-[120px] h-full bg-gradient-to-br from-red-500 to-red-600 rounded-xl border border-red-400/30 flex flex-col items-center justify-center gap-[0.2vh] group active:scale-[0.97] transition-all relative overflow-hidden shadow-[0_6px_24px_rgba(239,68,68,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute inset-0 animate-pulse opacity-20 bg-gradient-to-r from-transparent via-red-300/30 to-transparent"></div>
        <span className="text-[clamp(20px,2.2vw,34px)] font-black text-white tracking-wider leading-none drop-shadow-lg">STOP</span>
        <div className="flex flex-col items-center relative z-10">
          <span className="text-[clamp(8px,0.8vw,11px)] font-bold text-white/95 uppercase tracking-widest drop-shadow">EMERGENCY</span>
          <span className="text-[clamp(6px,0.55vw,8px)] font-medium text-white/70 tracking-wide">紧急制动</span>
        </div>
      </button>

      <div className="flex-1 h-full flex gap-1.5">
        {[
          { id: 'stage', label: '阶段切换', icon: ArrowRightLeft, sub: 'Stage' },
          { id: 'reset', label: '影像重置', icon: RefreshCw, sub: 'Reset' },
          { id: 'config', label: '系统设置', icon: Settings2, sub: 'Config' },
          { id: 'logs', label: '操作日志', icon: FileText, sub: 'Logs' },
          { id: 'collab', label: '数字协作', icon: Users, sub: 'Collab' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => setActiveCenterView(item.id)}
            className={`flex-1 ${activeCenterView === item.id ? 'bg-teal-500/10 border-teal-500/40 shadow-[0_0_16px_rgba(14,211,165,0.08)]' : 'bg-[#162638]/80 hover:bg-white/[0.04] border-white/[0.06]'} border rounded-xl flex flex-col items-center justify-center group transition-all relative min-w-0 shadow-sm overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>

            <div className="flex-1 flex items-center justify-center">
              <item.icon className={`w-[clamp(14px,1.4vw,26px)] h-[clamp(14px,1.4vw,26px)] ${activeCenterView === item.id ? 'text-teal-400' : 'text-slate-500'} group-hover:text-teal-400 transition-all duration-200 group-hover:scale-110 drop-shadow`} />
            </div>

            <div className="pb-[0.5vh] text-center px-1.5 flex flex-col items-center gap-[0.15vh]">
              <span className={`text-[clamp(8px,0.75vw,11px)] font-semibold ${activeCenterView === item.id ? 'text-white' : 'text-slate-400'} group-hover:text-white transition-colors tracking-wide truncate block`}>
                {item.label}
              </span>
              <span className={`text-[clamp(5px,0.5vw,7px)] font-medium ${activeCenterView === item.id ? 'text-teal-400/80' : 'text-slate-600'} uppercase tracking-wider`}>{item.sub}</span>
            </div>
            
            <div className={`absolute inset-x-0 bottom-0 h-[3px] flex items-center justify-center ${activeCenterView === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              <div className={`w-3/4 h-full bg-gradient-to-r from-transparent via-teal-400 to-transparent rounded-t-full transition-all duration-300`}></div>
            </div>
          </button>
        ))}
      </div>
    </footer>
  );
}
