
import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../../store';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { fetchCArmMode, setCArmMode, setCArmJointMove } from '../../store/services/api';

// Reusable components from RightPanel
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-3">
    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] shrink-0">{children}</h3>
    <div className="flex-1 h-px bg-gray-800" />
  </div>
);

const SliderControl: React.FC<any> = (props) => {
  const { label, value, min, max, unit, onChange, onInteractionStart, onInteractionEnd, accent, displayValue, displayUnit, speed, speedUnit, onSpeedChange } = props;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-0.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[11px] font-medium text-gray-300 shrink-0">{label}</span>
          {typeof speed === 'number' && onSpeedChange && (
            <label className="flex items-center gap-1 min-w-0">
              <span className="text-[9px] text-gray-500 shrink-0">速:</span>
              <input
                type="number"
                min={0}
                step={1}
                value={speed}
                onChange={(e) => onSpeedChange(Number(e.target.value) || 0)}
                className="w-12 h-5 px-1 rounded border border-gray-700 bg-gray-950 text-[10px] font-mono text-gray-200 outline-none focus:border-purple-400"
              />
            </label>
          )}
        </div>
        <span className="text-[11px] font-mono text-gray-400 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800 shrink-0">
          {displayValue ?? value}{displayUnit ?? unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={onInteractionStart}
        onPointerUp={onInteractionEnd}
        className={`w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer ${accent}`}
      />
    </div>
  );
};

const cArmHeightToDisplayMm = (height: number) => Math.abs(height);
const cArmFrontBackToDisplayMm = (translation: number) => translation - 150;

const JointMoveButtons: React.FC<{
  joint: string;
  speed: number;
  loadingJoint: string | null;
  onMove: (joint: string, speed: number) => Promise<void>;
}> = ({ joint, speed, loadingJoint, onMove }) => {
  const disabled = loadingJoint !== null;
  const loading = loadingJoint === joint;

  return (
    <div className="mt-2 w-full space-y-1.5">
      <div className="w-full rounded-xl border border-gray-800 bg-gray-950/70 p-1.5">
        <div className="grid w-full grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => void onMove(joint, Math.abs(speed))}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-purple-500/70 bg-purple-400/20 px-3 text-[12px] font-bold text-purple-100 hover:border-purple-300 hover:bg-purple-400/30 disabled:opacity-50"
          >
            上升
          </button>
          <button
            type="button"
            onClick={() => void onMove(joint, 0)}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-purple-500/70 bg-purple-400/20 px-3 text-[12px] font-bold text-purple-100 hover:border-purple-300 hover:bg-purple-400/30 disabled:opacity-50"
          >
            停止
          </button>
          <button
            type="button"
            onClick={() => void onMove(joint, -Math.abs(speed))}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-purple-500/70 bg-purple-400/20 px-3 text-[12px] font-bold text-purple-100 hover:border-purple-300 hover:bg-purple-400/30 disabled:opacity-50"
          >
            下降
          </button>
        </div>
      </div>
      {loading && <span className="block text-[10px] text-gray-400">发送中…</span>}
    </div>
  );
};

export const CArmTabPanel: React.FC = () => {
  const {
    cArm,
    setCArmRotation,
    setCArmFrontBackRotation,
    setCArmHeightJoint,
    setCArmFrontBackTranslation,
    addToast,
    setInteractionState,
    setInteractingPart,
  } = useStore();

  const [cArmModeState, setCArmModeState] = useState<1 | -1 | 0>(0);
  const [cArmModeLoading, setCArmModeLoading] = useState(false);
  const [loadingJoint, setLoadingJoint] = useState<string | null>(null);
  const [speeds, setSpeeds] = useState({
    height: 400,
    frontBack: 3000,
    rotation: 10000,
    cRingRotation: 10000,
  });

  const setSpeed = (key: keyof typeof speeds, value: number) => {
    setSpeeds((prev) => ({ ...prev, [key]: value }));
  };

  const sendJointMove = async (joint: string, speed: number) => {
    setLoadingJoint(joint);
    try {
      const result = await setCArmJointMove(joint, speed);
      if (!result.ok) {
        addToast(`关节动作失败：${result.error || 'unknown_error'}`, 'error');
        return;
      }
      addToast(`已发送 ${joint} 速度 ${speed}`, 'success');
    } finally {
      setLoadingJoint(null);
    }
  };

  const handleSetCArmMode = async (mode: 1 | -1 | 0) => {
    setCArmModeLoading(true);
    try {
      const ok = await setCArmMode(mode);
      if (ok) {
        setCArmModeState(mode);
        addToast(`已成功切换为 ${mode === 1 ? '同步' : mode === -1 ? '镜像' : '脱离'} 模式`, 'success');
      } else {
        addToast('模式切换失败', 'error');
      }
    } finally {
      setCArmModeLoading(false);
    }
  };

  useEffect(() => {
    void fetchCArmMode().then((m) => {
      if (m !== null) setCArmModeState(m.mode);
    });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      <SectionTitle>随动模式</SectionTitle>
      <div className="rounded-xl border border-purple-800/40 bg-gray-950/40 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.14em] text-purple-300 font-bold">C臂模式选择</div>
            <div className="text-[11px] text-gray-500">与手术床的联动策略</div>
          </div>
          <span className={clsx('text-[11px] font-bold px-3 py-1 rounded-lg border', cArmModeState === 1 ? 'border-emerald-600 text-emerald-300 bg-emerald-950/30' : cArmModeState === -1 ? 'border-amber-600 text-amber-300 bg-amber-950/30' : 'border-slate-600 text-slate-200 bg-slate-900/40')}>
            {cArmModeState === 1 ? '同步 (1)' : cArmModeState === -1 ? '镜像 (-1)' : '脱离 (0)'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '同步', val: 1, color: 'emerald' },
            { label: '镜像', val: -1, color: 'amber' },
            { label: '脱离', val: 0, color: 'slate' }
          ].map(({ label, val, color }) => (
            <button
              key={val}
              disabled={cArmModeLoading}
              onClick={() => void handleSetCArmMode(val as any)}
              className={clsx(
                "h-9 rounded-lg border text-[11px] font-bold transition-all disabled:opacity-50",
                cArmModeState === val ? `border-${color}-500 bg-${color}-950/40 text-${color}-200` : `border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700`
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <SectionTitle>手动关节控制</SectionTitle>
      <div className="space-y-6">
        {/* 运动1：升降 */}
        <div className="space-y-2">
          <SliderControl
            label="① 立柱升降"
            value={cArm.cArmHeightJoint ?? 0}
            min={300} max={400} unit="mm" centered live
            displayValue={cArmHeightToDisplayMm(cArm.cArmHeightJoint ?? 0)} displayUnit="mm"
            speed={speeds.height} speedUnit="mm/s" onSpeedChange={(v) => setSpeed('height', v)}
            onChange={(v: number) => setCArmHeightJoint(v)}
            onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('carm_height'); }}
            onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }}
            accent="accent-purple-400"
          />
          <JointMoveButtons joint="arm_height_joint" speed={speeds.height} loadingJoint={loadingJoint} onMove={sendJointMove} />
        </div>

        {/* 运动2：前后移动 */}
        <div className="space-y-2">
          <SliderControl
            label="② 前后移动"
            value={(cArm.frontBackTranslation ?? 150) - 150}
            min={-150} max={150} unit="mm" centered live
            displayValue={cArmFrontBackToDisplayMm(cArm.frontBackTranslation ?? 150)} displayUnit="mm"
            speed={speeds.frontBack} speedUnit="mm/s" onSpeedChange={(v) => setSpeed('frontBack', v)}
            onChange={(v: number) => setCArmFrontBackTranslation(v + 150)}
            onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('carm_frontBackTranslation'); }}
            onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }}
            accent="accent-purple-400"
          />
          <JointMoveButtons joint="arm_front_back_joint" speed={speeds.frontBack} loadingJoint={loadingJoint} onMove={sendJointMove} />
        </div>

        {/* 运动3：斜臂旋转 */}
        <div className="space-y-2">
          <SliderControl
            label="③ 斜臂旋转"
            value={cArm.cArmRotation ?? 0}
            min={-185} max={185} unit="°" centered live
            speed={speeds.rotation} speedUnit="°/s" onSpeedChange={(v) => setSpeed('rotation', v)}
            onChange={(v: number) => setCArmRotation(v)}
            onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('carm_rotation'); }}
            onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }}
            accent="accent-purple-400"
          />
          <JointMoveButtons joint="arm_tilt_joint" speed={speeds.rotation} loadingJoint={loadingJoint} onMove={sendJointMove} />
        </div>

        {/* 运动4：C环滚动 */}
        <div className="space-y-2">
          <SliderControl
            label="④ C环滚动"
            value={cArm.cArmFrontBackRotation ?? 0}
            min={-30} max={30} unit="°" centered live
            speed={speeds.cRingRotation} speedUnit="°/s" onSpeedChange={(v) => setSpeed('cRingRotation', v)}
            onChange={(v: number) => setCArmFrontBackRotation(v)}
            onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('carm_frontBackRotation'); }}
            onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }}
            accent="accent-purple-400"
          />
          <JointMoveButtons joint="c_ring_rotation_joint" speed={speeds.cRingRotation} loadingJoint={loadingJoint} onMove={sendJointMove} />
        </div>
      </div>

      <button
        onClick={() => { 
          setCArmHeightJoint(350); setCArmRotation(0); setCArmFrontBackRotation(0); setCArmFrontBackTranslation(150); 
          addToast('C臂关节已本地重置', 'info'); 
        }}
        className="w-full py-2.5 rounded-xl border border-gray-800 bg-gray-900/40 text-gray-400 hover:text-purple-300 hover:border-purple-800/60 text-xs font-bold flex items-center justify-center gap-2 transition-all"
      >
        <RefreshCw size={14} />重置本地关节位姿
      </button>
    </div>
  );
};
