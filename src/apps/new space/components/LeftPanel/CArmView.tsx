import { motion } from 'motion/react';
import { 
  ChevronLeft, Monitor, Zap, Crosshair, RotateCcw, RotateCw, Maximize2, Bed,
  Camera, Save, Power, Wifi, HardDrive, Thermometer, Clock, AlertCircle
} from 'lucide-react';

interface CArmViewProps {
  setLeftPanelMode: (mode: 'dashboard' | 'positions' | 'carm' | 'agv') => void;
}

export default function CArmView({ setLeftPanelMode }: CArmViewProps) {
  return (
    <motion.div
      key="carm"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col h-full overflow-hidden bg-[#162638]/90 backdrop-blur-xl rounded-3xl card-glow-border p-[1.5vw]"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-[2vh] pb-[1.5vh] border-b border-white/10">
        <button
          onClick={() => setLeftPanelMode('dashboard')}
          className="flex items-center gap-[0.6vw] text-slate-400 hover:text-medical-teal transition-colors group"
        >
          <ChevronLeft className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px] group-hover:-translate-x-1 transition-transform" />
          <span className="text-[clamp(12px,1vw,14px)] font-black uppercase tracking-widest">返回</span>
        </button>
        <h3 className="text-[clamp(15px,1.25vw,19px)] font-black text-white tracking-[0.3em] uppercase flex items-center gap-[0.8vw]">
          <Monitor className="w-[1.4vw] h-[1.4vw] min-w-[18px] min-h-[18px] text-medical-teal" />
          C-ARM 控制台
        </h3>
        <div className="flex items-center gap-[0.6vw] px-[0.8vw] py-[0.4vh] bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="w-[0.45vw] h-[0.45vw] min-w-[5px] min-h-[5px] rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[clamp(9px,0.75vw,11px)] font-bold text-emerald-400">在线</span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-[1.5vh] pr-[0.5vw]">
        {/* 设备信息卡片 */}
        <div className="bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/20 rounded-xl p-[1.2vw]">
          <div className="text-[clamp(9px,0.75vw,11px)] text-slate-500 font-black uppercase tracking-wider mb-[0.8vh]">设备型号 / MODEL</div>
          <div className="text-[clamp(13px,1.1vw,16px)] font-bold text-white">SIEMENS Artis Zee III</div>
          <div className="text-[clamp(10px,0.85vw,12px)] text-slate-500 mt-[0.3vh] font-mono">SN: ARTIS-2024-0892</div>
        </div>

        {/* 曝光参数 */}
        <div>
          <h5 className="text-[clamp(12px,1vw,14px)] font-bold text-blue-400 tracking-wider mb-[1vh] flex items-center gap-[0.6vw]">
            <Zap className="w-[1.1vw] h-[1.1vw] min-w-[14px] min-h-[14px]" />
            曝光参数 / EXPOSURE
          </h5>
          {[
            { label: '管电压 (kV)', value: '78', unit: 'kV', range: [40, 120], color: 'from-blue-500 to-cyan-400' },
            { label: '管电流 (mA)', value: '420', unit: 'mA', range: [10, 1000], color: 'from-purple-500 to-pink-400' },
            { label: '脉冲宽度 (ms)', value: '25', unit: 'ms', range: [1, 200], color: 'from-amber-500 to-orange-400' },
            { label: '帧率 (FPS)', value: '15', unit: 'fps', range: [1, 60], color: 'from-emerald-500 to-teal-400' }
          ].map((param, idx) => (
            <div key={idx} className="bg-black/20 rounded-xl p-[1vw] border border-white/5 mb-[0.8vh]">
              <div className="flex justify-between items-center mb-[0.5vh]">
                <span className="text-[clamp(10px,0.85vw,12px)] text-slate-400">{param.label}</span>
                <span className="font-mono font-bold text-white text-[clamp(12px,1vw,14px)]">{param.value} <span className="text-slate-500">{param.unit}</span></span>
              </div>
              <div className="relative h-[0.5vh] min-h-[5px] bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((parseInt(param.value) - param.range[0]) / (param.range[1] - param.range[0])) * 100}%` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  className={`h-full bg-gradient-to-r ${param.color} rounded-full`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 位置角度 */}
        <div>
          <h5 className="text-[clamp(12px,1vw,14px)] font-bold text-purple-400 tracking-wider mb-[1vh] flex items-center gap-[0.6vw]">
            <Crosshair className="w-[1.1vw] h-[1.1vw] min-w-[14px] min-h-[14px]" />
            位置角度 / POSITION
          </h5>
          <div className="grid grid-cols-2 gap-[0.8vw]">
            {[
              { label: 'LAO/RAO', value: '30° LAO', icon: RotateCcw },
              { label: 'CRA/CAU', value: '15° CRA', icon: RotateCw },
              { label: 'SID 距离', value: '110 cm', icon: Maximize2 },
              { label: '床面高度', value: '105 cm', icon: Bed }
            ].map((pos, idx) => (
              <div key={idx} className="bg-black/20 rounded-xl p-[1vw] border border-white/5 hover:border-purple-500/30 transition-all group cursor-pointer">
                <pos.icon className="w-[1vw] h-[1vw] min-w-[12px] min-h-[12px] text-slate-500 group-hover:text-purple-400 transition-colors mb-[0.3vh]" />
                <div className="text-[clamp(9px,0.75vw,11px)] text-slate-500">{pos.label}</div>
                <div className="font-mono font-bold text-white text-[clamp(11px,0.95vw,13px)] mt-[0.2vh]">{pos.value}</div>
              </div>
            ))}
          </div>

          {/* 快捷预设 */}
          <div className="mt-[1.2vh] pt-[1vh] border-t border-white/10">
            <div className="text-[clamp(9px,0.75vw,11px)] text-slate-500 mb-[0.6vh] font-bold uppercase tracking-wider">快捷预设</div>
            <div className="grid grid-cols-3 gap-[0.6vw]">
              {['AP', 'LAT', 'OBLIQUE'].map((preset) => (
                <button key={preset} className="py-[0.7vh] bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 rounded-lg text-[clamp(10px,0.85vw,12px)] font-bold text-slate-400 hover:text-purple-300 transition-all active:scale-[0.98]">
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DAP 剂量警告 */}
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 rounded-xl p-[1.2vw]">
          <div className="flex items-center justify-between mb-[0.6vh]">
            <span className="text-[clamp(11px,0.95vw,13px)] font-bold text-amber-300">DAP 累计剂量</span>
            <AlertCircle className="w-[1vw] h-[1vw] min-w-[12px] min-h-[12px] text-amber-400" />
          </div>
          <div className="flex items-baseline gap-[0.4vw]">
            <span className="text-[clamp(22px,1.8vw,28px)] font-display font-bold text-amber-400">128</span>
            <span className="text-[clamp(11px,0.95vw,13px)] text-amber-300/70 font-bold">mGy·cm²</span>
          </div>
          <div className="mt-[0.6vh] h-[0.4vh] min-h-[4px] bg-amber-500/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '64%' }}
              transition={{ duration: 1.5 }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-[0.4vh] text-[clamp(9px,0.75vw,11px)]">
            <span className="text-amber-400/60">64% 阈值</span>
            <span className="text-slate-500">限值: 200</span>
          </div>
        </div>

        {/* 操作按钮组 */}
        <div className="grid grid-cols-2 gap-[0.8vw]">
          <button className="py-[1.2vh] btn-medical-primary text-[#0d1117] font-bold text-[clamp(11px,0.95vw,14px)] flex items-center justify-center gap-[0.5vw]">
            <Camera className="w-[1.1vw] h-[1.1vw] min-w-[14px] min-h-[14px]" />
            曝光
          </button>
          <button className="py-[1.2vh] bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 font-bold text-[clamp(11px,0.95vw,14px)] transition-all active:scale-[0.98] flex items-center justify-center gap-[0.5vw]">
            <Save className="w-[1.1vw] h-[1.1vw] min-w-[14px] min-h-[14px]" />
            采集
          </button>
          <button className="py-[1.2vh] bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 font-bold text-[clamp(11px,0.95vw,14px)] transition-all active:scale-[0.98] flex items-center justify-center gap-[0.5vw]">
            <RotateCcw className="w-[1.1vw] h-[1.1vw] min-w-[14px] min-h-[14px]" />
            回零
          </button>
          <button className="py-[1.2vh] bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-bold text-[clamp(11px,0.95vw,14px)] transition-all active:scale-[0.98] flex items-center justify-center gap-[0.5vw]">
            <Power className="w-[1.1vw] h-[1.1vw] min-w-[14px] min-h-[14px]" />
            急停
          </button>
        </div>

        {/* 系统状态 */}
        <div className="bg-black/20 rounded-xl p-[1.2vw] border border-white/5">
          <div className="text-[clamp(9px,0.75vw,11px)] text-slate-500 font-black uppercase tracking-wider mb-[0.8vh]">系统状态 / SYSTEM STATUS</div>
          <div className="space-y-[0.6vh]">
            {[
              { icon: Wifi, label: '网络连接', value: '已连接', status: 'online' },
              { icon: HardDrive, label: '存储空间', value: '78%', status: 'normal' },
              { icon: Thermometer, label: '设备温度', value: '42°C', status: 'warning' },
              { icon: Clock, label: '运行时长', value: '04:32:18', status: 'normal' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-[0.4vh] border-b border-white/5 last:border-0">
                <div className="flex items-center gap-[0.6vw]">
                  <item.icon className={`w-[0.95vw] h-[0.95vw] min-w-[12px] min-h-[12px] ${
                    item.status === 'online' ? 'text-emerald-400' :
                    item.status === 'warning' ? 'text-amber-400' :
                    'text-slate-500'
                  }`} />
                  <span className="text-[clamp(10px,0.85vw,12px)] text-slate-400">{item.label}</span>
                </div>
                <span className={`font-mono font-bold text-[clamp(11px,0.95vw,13px)] ${
                  item.status === 'warning' ? 'text-amber-400' : 'text-white'
                }`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
