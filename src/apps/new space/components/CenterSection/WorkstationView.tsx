import { motion } from 'motion/react';
import {
  ChevronLeft, ArrowRightLeft, RefreshCw, Settings2, FileText, Users,
} from 'lucide-react';

interface WorkstationViewProps {
  activeCenterView: string;
  setActiveCenterView: (view: string | null) => void;
}

const VIEW_CONFIG: Record<string, { title: string; subtitle: string; icon: typeof ArrowRightLeft }> = {
  stage: { title: '阶段切换', subtitle: 'STAGE SWITCH', icon: ArrowRightLeft },
  reset: { title: '影像重置', subtitle: 'IMAGE RESET', icon: RefreshCw },
  config: { title: '系统设置', subtitle: 'SYSTEM CONFIG', icon: Settings2 },
  logs: { title: '操作日志', subtitle: 'OPERATION LOGS', icon: FileText },
  collab: { title: '数字协作', subtitle: 'DIGITAL COLLAB', icon: Users },
};

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-dashed border-white/10 flex items-center justify-center">
        <span className="text-3xl text-slate-600 font-light">{title.charAt(0)}</span>
      </div>
      <p className="text-sm text-slate-500 font-medium">功能开发中...</p>
      <p className="text-[11px] text-slate-600/60">此模块内容即将上线</p>
    </div>
  );
}

export default function WorkstationView({ activeCenterView, setActiveCenterView }: WorkstationViewProps) {
  const config = VIEW_CONFIG[activeCenterView];
  if (!config) return null;

  return (
    <motion.div
      key="workstation"
      initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex-1 flex flex-col min-h-0 bg-[#0a1628]/95 relative backdrop-blur-xl pt-[8vh]"
    >
      <div className="h-16 shrink-0 flex items-center justify-between px-12 bg-[#1a2942]/60 border-b border-white/10">
        <button
          onClick={() => setActiveCenterView(null)}
          className="flex items-center gap-4 text-slate-300 hover:text-teal-400 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center group-hover:scale-105 group-hover:border-teal-500 group-hover:bg-teal-500/20 transition-all">
            <ChevronLeft className="w-4 h-4 text-teal-400" />
          </div>
          <span className="text-[12px] font-black uppercase tracking-[0.25em]">返回主界面 / BACK</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_14px_#00e5cc]" />
          <h3 className="text-[14px] font-black text-white tracking-[0.3em] uppercase">{config.title} / {config.subtitle}</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-12 py-6">
        <div className="card-glow-border rounded-3xl p-6 bg-[#1a2942]/85 backdrop-blur-xl h-full flex flex-col">
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center">
                <config.icon className="w-4.5 h-4.5 text-teal-400" />
              </div>
              <h2 className="text-lg font-black text-white tracking-wide">{config.title}</h2>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <PlaceholderView title={config.title} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
