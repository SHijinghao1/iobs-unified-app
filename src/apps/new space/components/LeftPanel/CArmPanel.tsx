/**
 * @file CArmPanel.tsx
 * @description C臂控制面板组件，负责C臂的关节控制和模式切换
 * @author IOBS Team
 * @date 2024-01-01
 */

import React, { useEffect, useState } from 'react';

import { RefreshCw, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, StopCircle } from 'lucide-react';
import clsx from 'clsx';

import { useNewSpaceStore } from '../../store';
import {
  fetchNewSpaceCArmMode,
  setNewSpaceCArmMode,
  setNewSpaceCArmJointMove,
} from '../../services/carmApi';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-1.5">
    <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-[0.15em] shrink-0">{children}</h3>
    <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
  </div>
);

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  accent: string;
  displayValue?: string | number;
  displayUnit?: string;
  speed?: number;
  onSpeedChange?: (v: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = (props) => {
  const { label, value, min, max, unit, onChange, onInteractionStart, onInteractionEnd, accent, displayValue, displayUnit, speed, onSpeedChange } = props;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-0.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[12px] font-semibold text-gray-200 shrink-0">{label}</span>
          {typeof speed === 'number' && onSpeedChange && (
            <label className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-gray-500 shrink-0">速:</span>
              <input
                type="number"
                min={0}
                step={1}
                value={speed}
                onChange={(e) => onSpeedChange(Number(e.target.value) || 0)}
                className="w-13 h-6 px-1.5 rounded border border-gray-700/80 bg-gray-950/80 text-[11px] font-mono text-gray-200 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
              />
            </label>
          )}
        </div>
        <span className="text-[12px] font-mono text-gray-300 bg-gradient-to-br from-gray-900 to-gray-950 px-2 py-1 rounded-lg border border-gray-700/50 shrink-0 shadow-sm">
          {typeof (displayValue ?? value) === 'number' ? (displayValue ?? value).toFixed(1) : (displayValue ?? value)}{displayUnit ?? unit}
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
        className={`w-full h-1.5 bg-gray-800/60 rounded-full appearance-none cursor-pointer ${accent} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/40 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-all`}
      />
    </div>
  );
};

const JointMoveButtons: React.FC<{ joint: string; speed: number; loadingJoint: string | null; loadingDirection: 'up' | 'down' | null; onMove: (joint: string, speed: number) => Promise<void>; upLabel?: string; downLabel?: string; UpIcon?: typeof ArrowUp; DownIcon?: typeof ArrowDown; reverseOrder?: boolean; }> = ({ joint, speed, loadingJoint, loadingDirection, onMove, upLabel = '上升', downLabel = '下降', UpIcon = ArrowUp, DownIcon = ArrowDown, reverseOrder = false }) => {
  const isActiveUp = loadingJoint === joint && loadingDirection === 'up';
  const isActiveDown = loadingJoint === joint && loadingDirection === 'down';
  const disabled = loadingJoint !== null && loadingJoint !== joint;
  const handleUpClick = () => {
    if (isActiveUp) {
      void onMove(joint, 0);
    } else {
      void onMove(joint, Math.abs(speed));
    }
  };
  const handleDownClick = () => {
    if (isActiveDown) {
      void onMove(joint, 0);
    } else {
      void onMove(joint, -Math.abs(speed));
    }
  };
  const upButton = (
    <button
      type="button"
      onClick={handleUpClick}
      disabled={disabled}
      className={`flex-1 h-8 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.96] disabled:opacity-40 ${
        isActiveUp
          ? 'bg-emerald-500/30 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
          : 'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40'
      }`}
    >
      {isActiveUp ? (
        <StopCircle className="w-4 h-4 text-emerald-300 animate-pulse" />
      ) : (
        <UpIcon className="w-4 h-4 text-emerald-400" />
      )}
      <span className="text-[11px] font-semibold text-emerald-400/80 tracking-wide uppercase">{isActiveUp ? 'Stop' : upLabel}</span>
    </button>
  );
  const downButton = (
    <button
      type="button"
      onClick={handleDownClick}
      disabled={disabled}
      className={`flex-1 h-8 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.96] disabled:opacity-40 ${
        isActiveDown
          ? 'bg-emerald-500/30 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
          : 'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40'
      }`}
    >
      {isActiveDown ? (
        <StopCircle className="w-4 h-4 text-emerald-300 animate-pulse" />
      ) : (
        <DownIcon className="w-4 h-4 text-emerald-400" />
      )}
      <span className="text-[11px] font-semibold text-emerald-400/80 tracking-wide uppercase">{isActiveDown ? 'Stop' : downLabel}</span>
    </button>
  );
  return (
    <div className="flex gap-1.5 mt-0.5">
      {reverseOrder ? downButton : upButton}
      {reverseOrder ? upButton : downButton}
    </div>
  );
};

const cArmHeightToDisplayMm = (height: number, raw?: number) => (raw !== undefined && !Number.isNaN(raw) ? raw : Math.abs(height)).toFixed(1);
const cArmFrontBackToDisplayMm = (translation: number, raw?: number) => (raw !== undefined && !Number.isNaN(raw) ? raw : translation - 150).toFixed(1);

export default function CArmPanel() {
  const {
    cArmRotation,
    cArmFrontBackRotation,
    cArmHeightJoint,
    frontBackTranslation,
    setCArmRotation,
    setCArmFrontBackRotation,
    setCArmHeightJoint,
    setCArmFrontBackTranslation,
    setCArmInteractionState,
    setCArmInteractingPart,
    cArmRawJoints,
  } = useNewSpaceStore();

  const addToast = useNewSpaceStore((s) => s.pushToast);
  const [cArmModeState, setCArmModeState] = useState<1 | -1 | 0>(0);
  const [cArmModeLoading, setCArmModeLoading] = useState(false);
  const [loadingJoint, setLoadingJoint] = useState<string | null>(null);
  const [loadingDirection, setLoadingDirection] = useState<'up' | 'down' | null>(null);
  const [speeds, setSpeeds] = useState({ height: 400, frontBack: 3000, rotation: 10000, cRingRotation: 10000 });
  const [controlMode, setControlMode] = useState<'auto' | 'manual'>('manual');
  const [controlModeLoading, setControlModeLoading] = useState(false);

  const setSpeed = (key: keyof typeof speeds, value: number) => setSpeeds((prev) => ({ ...prev, [key]: value }));

  const JOINT_TO_PART: Record<string, string> = {
    arm_height_joint: 'carm_height',
    arm_front_back_joint: 'carm_frontBackTranslation',
    arm_tilt_joint: 'carm_rotation',
    c_ring_rotation_joint: 'carm_frontBackRotation',
  };

  const sendJointMove = async (joint: string, speed: number) => {
    const part = JOINT_TO_PART[joint];
    const direction = speed > 0 ? 'up' : 'down';

    if (speed !== 0) {
      setCArmInteractionState('USER_INTERACTING');
      if (part) setCArmInteractingPart(part);
    } else {
      setCArmInteractionState('AWAITING_BACKEND_UPDATE');
      setCArmInteractingPart(null);
    }

    if (speed !== 0) {
      setLoadingJoint(joint);
      setLoadingDirection(direction);
    }

    try {
      const result = await setNewSpaceCArmJointMove(joint, speed);
      if (!result.ok) {
        addToast(`关节动作失败：${result.error || 'unknown_error'}`, 'error');
        setCArmInteractionState('AWAITING_BACKEND_UPDATE');
        setCArmInteractingPart(null);
        setLoadingJoint(null);
        setLoadingDirection(null);
        return;
      }
      if (speed === 0) {
        setLoadingJoint(null);
        setLoadingDirection(null);
        addToast(`已停止 ${joint}`, 'info');
      } else {
        addToast(`已发送 ${joint} 速度 ${speed}`, 'success');
      }
    } catch {
      setLoadingJoint(null);
      setLoadingDirection(null);
      setCArmInteractionState('AWAITING_BACKEND_UPDATE');
      setCArmInteractingPart(null);
    }
  };

  const handleSetCArmMode = async (mode: 1 | -1 | 0) => {
    setCArmModeLoading(true);
    try {
      const autoVal = controlMode === 'auto' ? 1 : 0;
      const ok = await setNewSpaceCArmMode(mode, autoVal as 0 | 1);
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

  const handleSetControlMode = async (mode: 'auto' | 'manual') => {
    setControlModeLoading(true);
    try {
      const autoVal = mode === 'auto' ? 1 : 0;
      const ok = await setNewSpaceCArmMode(cArmModeState, autoVal as 0 | 1);
      if (ok) {
        setControlMode(mode);
        addToast(`已切换为 ${mode === 'auto' ? '自动' : '手动'} 跟随模式`, 'success');
      } else {
        addToast('控制模式切换失败', 'error');
      }
    } finally {
      setControlModeLoading(false);
    }
  };

  useEffect(() => {
    void fetchNewSpaceCArmMode().then((m) => {
      if (m) {
        setCArmModeState(m.mode);
        setControlMode(m.auto === 1 ? 'auto' : 'manual');
      }
    });
  }, []);

  return (
    <div className="overflow-y-auto overflow-x-hidden px-4 py-2 space-y-3">
      <SectionTitle>随动模式</SectionTitle>
      <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-gray-900/60 to-gray-950/70 p-2.5 space-y-2 backdrop-blur-sm shadow-lg shadow-purple-500/10">
        <div className="text-[12px] uppercase tracking-[0.14em] text-purple-300 font-bold">C臂模式选择</div>
        <div className="flex items-center gap-3">
          <select
            value={cArmModeState}
            disabled={cArmModeLoading}
            onChange={(e) => void handleSetCArmMode(Number(e.target.value) as 1 | -1 | 0)}
            className={clsx('flex-1 h-8 rounded-lg border text-[12px] font-bold px-2 outline-none transition-all duration-200 disabled:opacity-50', 'border-gray-700/60 bg-gray-900/40 text-gray-300 hover:border-purple-500/50 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30')}
          >
            <option value={1}>同步</option>
            <option value={-1}>镜像</option>
            <option value={0}>脱离</option>
          </select>
          <select
            value={controlMode}
            disabled={controlModeLoading}
            onChange={(e) => void handleSetControlMode(e.target.value as 'auto' | 'manual')}
            className={clsx('flex-1 h-8 rounded-lg border text-[12px] font-bold px-2 outline-none transition-all duration-200 disabled:opacity-50', controlMode === 'auto' ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300' : 'border-amber-500/60 bg-amber-950/40 text-amber-300', 'hover:border-opacity-80 focus:ring-1 focus:ring-purple-400/30')}
          >
            <option value="auto">自动</option>
            <option value="manual">手动</option>
          </select>
        </div>
      </div>

      <SectionTitle>手动关节控制</SectionTitle>
      <div className="space-y-3">
        <div className="space-y-2">
          <SliderControl label="① 立柱升降" value={cArmHeightJoint} min={300} max={400} unit="mm" displayValue={cArmHeightToDisplayMm(cArmHeightJoint, cArmRawJoints.arm_height_joint)} displayUnit="mm" speed={speeds.height} onSpeedChange={(v: number) => setSpeed('height', v)} onChange={(v: number) => setCArmHeightJoint(v)} onInteractionStart={() => { setCArmInteractionState('USER_INTERACTING'); setCArmInteractingPart('carm_height'); }} onInteractionEnd={() => { setCArmInteractionState('AWAITING_BACKEND_UPDATE'); setCArmInteractingPart(null); }} accent="accent-purple-400" />
          <JointMoveButtons joint="arm_height_joint" speed={speeds.height} loadingJoint={loadingJoint} loadingDirection={loadingDirection} onMove={sendJointMove} />
        </div>

        <div className="space-y-2">
          <SliderControl label="② 前后移动" value={frontBackTranslation - 150} min={-150} max={150} unit="mm" displayValue={cArmFrontBackToDisplayMm(frontBackTranslation, cArmRawJoints.column_to_head_lower_joint ?? cArmRawJoints.arm_front_back_joint)} displayUnit="mm" speed={speeds.frontBack} onSpeedChange={(v: number) => setSpeed('frontBack', v)} onChange={(v: number) => setCArmFrontBackTranslation(v + 150)} onInteractionStart={() => { setCArmInteractionState('USER_INTERACTING'); setCArmInteractingPart('carm_frontBackTranslation'); }} onInteractionEnd={() => { setCArmInteractionState('AWAITING_BACKEND_UPDATE'); setCArmInteractingPart(null); }} accent="accent-purple-400" />
          <JointMoveButtons joint="arm_front_back_joint" speed={speeds.frontBack} loadingJoint={loadingJoint} loadingDirection={loadingDirection} onMove={sendJointMove} upLabel="前移" downLabel="后移" />
        </div>

        <div className="space-y-2">
          <SliderControl label="③ 斜臂旋转" value={cArmRotation} min={-185} max={185} unit="°" speed={speeds.rotation} onSpeedChange={(v: number) => setSpeed('rotation', v)} onChange={(v: number) => setCArmRotation(v)} onInteractionStart={() => { setCArmInteractionState('USER_INTERACTING'); setCArmInteractingPart('carm_rotation'); }} onInteractionEnd={() => { setCArmInteractionState('AWAITING_BACKEND_UPDATE'); setCArmInteractingPart(null); }} accent="accent-purple-400" />
          <JointMoveButtons joint="arm_tilt_joint" speed={speeds.rotation} loadingJoint={loadingJoint} loadingDirection={loadingDirection} onMove={sendJointMove} upLabel="右旋" downLabel="左旋" UpIcon={ArrowRight} DownIcon={ArrowLeft} reverseOrder />
        </div>

        <div className="space-y-2">
          <SliderControl label="④ C环滚动" value={cArmFrontBackRotation} min={-30} max={30} unit="°" speed={speeds.cRingRotation} onSpeedChange={(v: number) => setSpeed('cRingRotation', v)} onChange={(v: number) => setCArmFrontBackRotation(v)} onInteractionStart={() => { setCArmInteractionState('USER_INTERACTING'); setCArmInteractingPart('carm_frontBackRotation'); }} onInteractionEnd={() => { setCArmInteractionState('AWAITING_BACKEND_UPDATE'); setCArmInteractingPart(null); }} accent="accent-purple-400" />
          <JointMoveButtons joint="c_ring_rotation_joint" speed={speeds.cRingRotation} loadingJoint={loadingJoint} loadingDirection={loadingDirection} onMove={sendJointMove} upLabel="上滑" downLabel="下滑" />
        </div>
      </div>

      <button onClick={() => { setCArmHeightJoint(350); setCArmRotation(0); setCArmFrontBackRotation(0); setCArmFrontBackTranslation(150); addToast('C臂关节已本地重置', 'info'); }} className="w-full py-2 rounded-xl border border-gray-700/60 bg-gradient-to-r from-gray-900/50 to-gray-950/60 text-gray-400 hover:text-purple-300 hover:border-purple-500/40 hover:bg-gradient-to-br hover:from-purple-950/30 hover:to-gray-950/60 text-[12px] font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-purple-500/10 active:scale-[0.99]">
        <RefreshCw size={14} />重置本地关节位姿
      </button>
    </div>
  );
}
