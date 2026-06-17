
import React from 'react';
import { useStore } from '../../store';
import {
  Sun,
  Thermometer,
  Droplets,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-3 mt-2">
    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] shrink-0">{children}</h3>
    <div className="flex-1 h-px bg-gray-800/50" />
  </div>
);

const ControlCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx("p-4 bg-gray-900/40 rounded-xl border border-gray-800/60 space-y-4", className)}>
    {children}
  </div>
);

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  step?: number;
  onChange: (v: number) => void;
  accentColor?: string;
}> = ({ label, value, min, max, unit = '', step = 1, onChange, accentColor = 'bg-neon-cyan' }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <span className="text-[11px] font-mono text-gray-200 bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/50">
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={clsx(
        "w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan",
        accentColor === 'bg-amber-500' && "accent-amber-500"
      )}
    />
  </div>
);

const ToggleItem: React.FC<{
  label: string;
  icon: LucideIcon;
  active: boolean;
  onToggle: () => void;
  description?: string;
}> = ({ label, icon: Icon, active, onToggle, description }) => (
  <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-gray-950/40 border border-gray-800/40 transition-all hover:bg-gray-950/60">
    <div className="flex items-center gap-3">
      <div className={clsx(
        "p-2 rounded-lg transition-colors",
        active ? "bg-neon-cyan/10 text-neon-cyan" : "bg-gray-800 text-gray-500"
      )}>
        <Icon size={16} />
      </div>
      <div>
        <div className="text-[11px] font-bold text-gray-200">{label}</div>
        {description && <div className="text-[9px] text-gray-500">{description}</div>}
      </div>
    </div>
    <button
      onClick={onToggle}
      className={clsx(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        active ? "bg-neon-cyan" : "bg-gray-700"
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          active ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  </div>
);

const SegmentedControl: React.FC<{
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: any) => void;
}> = ({ label, options, value, onChange }) => (
  <div className="space-y-2">
    <span className="text-[11px] text-gray-400 font-medium">{label}</span>
    <div className="grid grid-cols-3 gap-1 p-1 bg-gray-950/60 rounded-lg border border-gray-800/60">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "py-1.5 text-[10px] font-bold rounded-md transition-all",
            value === opt.value 
              ? "bg-gray-800 text-neon-cyan shadow-sm" 
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const EnvStatCard: React.FC<{
  label: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  color: string;
}> = ({ label, value, unit, icon: Icon, color }) => (
  <div className="flex-1 p-3 bg-gray-950/40 rounded-xl border border-gray-800/40">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={12} className={color} />
      <span className="text-[10px] text-gray-500 font-medium">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-mono font-bold text-gray-100">{value}</span>
      <span className="text-[10px] text-gray-500">{unit}</span>
    </div>
  </div>
);

export const EnvTabPanel: React.FC = () => {
  const { environment, setEnvironment } = useStore();
  const setEnv = setEnvironment as (key: string, value: unknown) => void;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
      
      {/* 实时环境指标 */}
      <div className="space-y-3">
        <SectionTitle>实时指标</SectionTitle>
        <div className="flex gap-3">
          <EnvStatCard 
            label="手术室温度" 
            value={environment.temperature} 
            unit="°C" 
            icon={Thermometer} 
            color="text-orange-400"
          />
          <EnvStatCard 
            label="相对湿度" 
            value={environment.humidity} 
            unit="%" 
            icon={Droplets} 
            color="text-blue-400"
          />
        </div>
      </div>

      {/* 灯光系统 */}
      <div className="space-y-3">
        <SectionTitle>灯光系统</SectionTitle>
        <ControlCard className="border-amber-900/20">
          <ToggleItem 
            label="手术无影灯" 
            icon={Sun} 
            active={environment.lighting.status}
            onToggle={() => setEnv('lighting.status', !environment.lighting.status)}
            description={environment.lighting.status ? "已开启全亮度模式" : "灯光已关闭"}
          />
          
          <div className={clsx("space-y-4 transition-all", !environment.lighting.status && "opacity-40 pointer-events-none grayscale")}>
            <SliderControl 
              label="亮度强度" 
              value={environment.lighting.intensity} 
              min={0} max={100} unit="%"
              onChange={(v) => setEnv('lighting.intensity', v)}
            />
            <SliderControl 
              label="色温调节" 
              value={environment.lighting.colorTemp} 
              min={2700} max={6500} step={100} unit="K"
              accentColor="bg-amber-500"
              onChange={(v) => setEnv('lighting.colorTemp', v)}
            />
          </div>
        </ControlCard>
      </div>

      {/* 空气净化系统 */}
      <div className="space-y-3 pb-6">
        <SectionTitle>空气与净化</SectionTitle>
        <ControlCard className="border-blue-900/20">
          <ToggleItem 
            label="层流净化系统" 
            icon={ShieldCheck} 
            active={environment.ventilation.laminarFlow}
            onToggle={() => setEnv('ventilation.laminarFlow', !environment.ventilation.laminarFlow)}
            description="高效空气净化器状态"
          />
          
          <div className={clsx("space-y-4 transition-all", !environment.ventilation.laminarFlow && "opacity-40 pointer-events-none")}>
            <SegmentedControl 
              label="排风扇转速"
              value={environment.ventilation.speed}
              options={[
                { label: '低速', value: 'low' },
                { label: '中速', value: 'medium' },
                { label: '高速', value: 'high' }
              ]}
              onChange={(v) => setEnv('ventilation.speed', v)}
            />
          </div>
        </ControlCard>
      </div>

    </div>
  );
};
