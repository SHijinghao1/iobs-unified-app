import { motion } from 'motion/react';
import { ChevronLeft, Bed, Accessibility, Activity, Move, MoveHorizontal } from 'lucide-react';

interface PositionsViewProps {
  setLeftPanelMode: (mode: 'dashboard' | 'positions' | 'carm' | 'agv') => void;
}

export default function PositionsView({ setLeftPanelMode }: PositionsViewProps) {
  return (
    <motion.div
      key="positions"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full overflow-hidden bg-[#162638]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6"
    >
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => setLeftPanelMode('dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-medical-teal transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[14px] font-black uppercase tracking-widest">返回</span>
        </button>
        <h3 className="text-[16px] font-black text-white tracking-[0.3em] uppercase">完整姿态库</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        {[
          { label: '标准平卧', sub: 'Standard Supine', desc: '用于一般腹部、心脏及神经外科手术', icon: Bed },
          { label: '头低脚高', sub: 'Trendelenburg', desc: '改善下腹部入路，有利于回肠移出', icon: Accessibility },
          { label: '头高脚低', sub: 'Reverse Trendelenburg', desc: '用于上腹部及头颈部手术', icon: Accessibility },
          { label: '侧卧位 (左)', sub: 'Lateral Decubitus (L)', desc: '用于侧入路胸腔或肾脏手术', icon: Activity },
          { label: '侧卧位 (右)', sub: 'Lateral Decubitus (R)', desc: '用于侧入路胸腔或肾脏手术', icon: Activity },
          { label: '入路定位', sub: 'Lateral Positioning', desc: '精确定位手术入路角度', icon: Move },
          { label: '截石位', sub: 'Lithotomy', desc: '用于妇科、泌尿外科手术', icon: Accessibility },
          { label: '俯卧位', sub: 'Prone Position', desc: '用于脊柱及后侧体表手术', icon: Bed },
          { label: '沙滩椅位', sub: 'Beach Chair', desc: '专门用于关节镜肩部手术', icon: Accessibility },
          { label: '侧卧侧偏', sub: 'Lateral Tilt', desc: '动态调整术中显露视野', icon: MoveHorizontal },
        ].map((item) => (
          <div key={item.label} className="bg-[#0b1421] border border-white/5 rounded-2xl p-4 group hover:border-medical-teal/30 hover:bg-white/[0.02] transition-all cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#152232] rounded-xl flex items-center justify-center text-slate-500 group-hover:text-medical-teal transition-all">
                {item.icon && <item.icon className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[17px] font-bold text-slate-200 group-hover:text-white transition-colors">{item.label}</span>
                  <button className="px-5 py-1.5 btn-medical-primary text-[#0d1117] text-[11px] font-black rounded-lg transition-all uppercase tracking-widest">调用</button>
                </div>
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">{item.sub}</div>
                <div className="text-[12px] text-slate-400 font-medium group-hover:text-slate-300 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
