/**
 * @file DashboardView.tsx
 * @description 仪表板视图组件，融合手术床控制与传感器遥测
 * @author IOBS Team
 * @date 2024-01-01
 */

import { useMemo, useState, useCallback } from 'react';

import { motion } from 'motion/react';
import { Signal, Gauge, ChevronRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, StopCircle } from 'lucide-react';

import { useNewSpaceStore } from '../../store';

interface DashboardViewProps {
  setLeftPanelMode: (mode: 'dashboard' | 'carm' | 'positions' | 'agv') => void;
}

const BED_STATUS_CONFIG = [
  { id: 'bed_height_joint', label: '床高高度', key: 'height', min: 500, max: 1000, unit: 'mm', icon: 'H' },
  { id: 'bed_front_back_joint', label: '前后移动', key: 'frontBackPosition', min: -200, max: 200, unit: 'mm', icon: 'F' },
  { id: 'bed_tilt_joint', label: '前后倾斜', key: 'trendelenburg', min: -22, max: 22, unit: '°', icon: 'T' },
  { id: 'bed_lateral_joint', label: '左右倾斜', key: 'lateral', min: -15, max: 15, unit: '°', icon: 'L' },
  { id: 'bed_panel_back_joint', label: '背板上下折', key: 'backrestAngle', min: -70, max: 70, unit: '°', icon: 'B' },
  { id: 'bed_head_board_joint', label: '头板上下折', key: 'headBoardAngle', min: -70, max: 70, unit: '°', icon: 'H' },
  { id: 'bed_panel_left_leg_joint', label: '左大腿上下折', key: 'leftLegAngle', min: -90, max: 90, unit: '°', icon: 'L' },
  { id: 'bed_panel_left_leg_lower_joint', label: '左小腿上下折', key: 'leftLowerLegAngle', min: -90, max: 90, unit: '°', icon: 'L' },
  { id: 'bed_panel_right_leg_joint', label: '右大腿上下折', key: 'rightLegAngle', min: -90, max: 90, unit: '°', icon: 'R' },
  { id: 'bed_panel_right_leg_lower_joint', label: '右小腿上下折', key: 'rightLowerLegAngle', min: -90, max: 90, unit: '°', icon: 'R' },
];

const DEFAULT_SPEEDS: Record<string, number> = {
  bed_height_joint: 400,
  bed_tilt_joint: 400,
  bed_lateral_joint: 400,
  bed_front_back_joint: 2500,
  bed_panel_back_joint: 10000,
  bed_head_board_joint: 10000,
  bed_panel_left_leg_joint: 400,
  bed_panel_left_leg_lower_joint: 400,
  bed_panel_right_leg_joint: 400,
  bed_panel_right_leg_lower_joint: 400,
};

const SPEED_LIMITS: Record<string, { min: number; max: number; step: number }> = {
  bed_height_joint: { min: 0, max: 10000, step: 50 },
  bed_tilt_joint: { min: 0, max: 10000, step: 10 },
  bed_lateral_joint: { min: 0, max: 10000, step: 10 },
  bed_front_back_joint: { min: 0, max: 10000, step: 50 },
  bed_panel_back_joint: { min: 0, max: 10000, step: 10 },
  bed_head_board_joint: { min: 0, max: 10000, step: 10 },
  bed_panel_left_leg_joint: { min: 0, max: 10000, step: 10 },
  bed_panel_left_leg_lower_joint: { min: 0, max: 10000, step: 10 },
  bed_panel_right_leg_joint: { min: 0, max: 10000, step: 10 },
  bed_panel_right_leg_lower_joint: { min: 0, max: 10000, step: 10 },
};

const JOINT_TO_PART: Record<string, string> = {
  bed_height_joint: 'bed_height',
  bed_tilt_joint: 'bed_trendelenburg',
  bed_lateral_joint: 'bed_lateral',
  bed_front_back_joint: 'bed_frontBackPosition',
  bed_panel_back_joint: 'bed_backrestAngle',
  bed_head_board_joint: 'bed_headBoardAngle',
  bed_panel_left_leg_joint: 'bed_leftLegAngle',
  bed_panel_left_leg_lower_joint: 'bed_leftLowerLegAngle',
  bed_panel_right_leg_joint: 'bed_rightLegAngle',
  bed_panel_right_leg_lower_joint: 'bed_rightLowerLegAngle',
};

export default function DashboardView({ setLeftPanelMode }: DashboardViewProps) {
  const sendBedJointMoveWithSpeed = useNewSpaceStore((state) => state.sendBedJointMoveWithSpeed);
  const setBedJointSpeed = useNewSpaceStore((state) => state.setBedJointSpeed);
  const bedJointSpeeds = useNewSpaceStore((state) => state.bedJointSpeeds);
  const setBedInteractionState = useNewSpaceStore((state) => state.setBedInteractionState);
  const setBedInteractingPart = useNewSpaceStore((state) => state.setBedInteractingPart);
  const selectedTelemetryModuleId = useNewSpaceStore((state) => state.selectedTelemetryModuleId);
  const setSelectedTelemetryModuleId = useNewSpaceStore((state) => state.setSelectedTelemetryModuleId);
  const bed = useNewSpaceStore((state) => state.bed);
  const bedRawJoints = useNewSpaceStore((state) => state.bedRawJoints);

  const [speedMode, setSpeedMode] = useState(false);
  const [activeJointId, setActiveJointId] = useState<string | null>(null);
  const [activeJointDirection, setActiveJointDirection] = useState<'up' | 'down' | null>(null);

  const stopCurrentMovement = useCallback(async () => {
    if (!activeJointId) return;
    await sendBedJointMoveWithSpeed(activeJointId, 0);
    setActiveJointId(null);
    setActiveJointDirection(null);
    setBedInteractionState('AWAITING_BACKEND_UPDATE');
    setBedInteractingPart(null);
  }, [activeJointId, sendBedJointMoveWithSpeed, setBedInteractionState, setBedInteractingPart]);

  const handleJointMove = useCallback(async (jointId: string, direction: 'up' | 'down') => {
    if (activeJointId === jointId && activeJointDirection === direction) {
      await stopCurrentMovement();
      return;
    }

    if (activeJointId !== null) {
      await sendBedJointMoveWithSpeed(activeJointId, 0);
    }

    const speed = bedJointSpeeds[jointId] ?? DEFAULT_SPEEDS[jointId];
    const actualSpeed = direction === 'up' ? Math.abs(speed) : -Math.abs(speed);

    setBedInteractionState('USER_INTERACTING');
    setBedInteractingPart(JOINT_TO_PART[jointId] || jointId);
    setActiveJointId(jointId);
    setActiveJointDirection(direction);

    try {
      await sendBedJointMoveWithSpeed(jointId, actualSpeed);
    } catch {
      setActiveJointId(null);
      setActiveJointDirection(null);
      setBedInteractionState('AWAITING_BACKEND_UPDATE');
      setBedInteractingPart(null);
    }
  }, [activeJointId, activeJointDirection, bedJointSpeeds, sendBedJointMoveWithSpeed, setBedInteractionState, setBedInteractingPart, stopCurrentMovement]);

  const updateSpeed = (id: string, value: number) => {
    setBedJointSpeed(id, value);
  };

  const statusItems = useMemo(() => {
    return BED_STATUS_CONFIG.map((config) => {
      const rawValue = bed[config.key as keyof typeof bed] ?? 0;
      const value = typeof rawValue === 'number' ? rawValue : 0;
      const range = config.max - config.min;
      const normalizedValue = ((value - config.min) / range) * 100;
      const progress = Math.max(0, Math.min(100, normalizedValue));

      const displayRawValue = bedRawJoints[config.id];
      let displayValue: number;
      if (displayRawValue !== undefined && !Number.isNaN(displayRawValue)) {
        displayValue = displayRawValue;
      } else {
        displayValue = value;
      }

      if (config.id === 'bed_panel_left_leg_joint' || config.id === 'bed_panel_right_leg_joint' || config.id === 'bed_panel_left_leg_lower_joint' || config.id === 'bed_panel_right_leg_lower_joint' || config.id === 'bed_head_board_joint') {
        displayValue = -displayValue;
      }

      return {
        id: config.id,
        label: config.label,
        value: Number(displayValue.toFixed(1)),
        unit: config.unit,
        icon: config.icon,
        progress: Math.round(progress),
      };
    });
  }, [bed, bedRawJoints]);

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="bg-[#162638]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-2.5 flex flex-col flex-1 min-h-0 shadow-lg overflow-hidden">
        <div className="flex justify-between items-center mb-2 px-0.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
            <Signal className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-bold text-white/90 tracking-wide">手术床控制</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeedMode(!speedMode)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer duration-200 ${speedMode ? 'bg-amber-500/15 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07] hover:border-white/20'}`}
          >
            <Gauge className={`w-3 h-3 transition-colors ${speedMode ? 'text-amber-400' : 'text-slate-400'}`} />
            <ChevronRight className={`w-2.5 h-2.5 transition-transform duration-200 ${speedMode ? 'rotate-90 text-amber-400' : 'text-slate-500'}`} />
            <span className={`text-[10px] font-semibold tracking-wide transition-colors ${speedMode ? 'text-amber-400' : 'text-slate-300'}`}>速度设置</span>
          </button>
        </div>

        <div className="space-y-1.5 flex-1 min-h-0 pr-1 overflow-y-auto custom-scrollbar">
          {statusItems.map((item) => {
            const isSelected = selectedTelemetryModuleId === item.id;
            const isActiveUp = activeJointId === item.id && activeJointDirection === 'up';
            const isActiveDown = activeJointId === item.id && activeJointDirection === 'down';
            const limits = SPEED_LIMITS[item.id];
            const currentSpeed = bedJointSpeeds[item.id] ?? DEFAULT_SPEEDS[item.id];

            return (
              <div
                key={item.id}
                onClick={() => !speedMode && setSelectedTelemetryModuleId(isSelected ? null : item.id)}
                className={`${!speedMode ? 'cursor-pointer' : ''} bg-[#0f1924]/60 py-[16px] px-3 rounded-xl border transition-all duration-200 flex items-center gap-2.5 shrink-0 relative overflow-hidden text-left w-full ${isSelected ? 'border-teal-500/40 bg-teal-500/[0.06] shadow-[0_0_20px_rgba(14,211,165,0.08)]' : 'border-white/[0.06] hover:border-white/15 hover:bg-white/[0.03]'}`}
              >
                <div className={`absolute right-0 top-0 bottom-0 w-[3px] rounded-l-full transition-all duration-300 ${isSelected ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.4)]' : 'bg-transparent'}`}></div>

                <div className="shrink-0">
                  <div className={`w-9 h-9 rounded-lg bg-[#0a1018] border flex items-center justify-center transition-all duration-200 ${speedMode ? 'border-amber-500/25 bg-amber-500/5' : isSelected ? 'border-teal-500/35 bg-teal-500/[0.05]' : 'border-white/[0.06]'}`}>
                    <span className={`text-[13px] font-mono font-bold transition-colors ${speedMode ? 'text-amber-400' : isSelected ? 'text-teal-400' : 'text-slate-500'}`}>{item.icon}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[13px] font-medium transition-colors truncate ${speedMode ? 'text-amber-400/90' : isSelected ? 'text-white' : 'text-slate-300'}`}>{item.label}</span>

                    {!speedMode ? (
                      <div className="flex items-baseline gap-1 ml-2 shrink-0">
                        <span className="text-sm font-semibold text-white tracking-tight">{item.value.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{item.unit}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="range"
                          min={limits.min}
                          max={limits.max}
                          step={limits.step}
                          value={currentSpeed}
                          onChange={(e) => updateSpeed(item.id, Number(e.target.value))}
                          className="w-[55px] h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                        />
                        <input
                          type="number"
                          min={limits.min}
                          max={limits.max}
                          step={limits.step}
                          value={currentSpeed}
                          onChange={(e) => updateSpeed(item.id, Math.max(limits.min, Math.min(limits.max, Number(e.target.value) || limits.min)))}
                          className="w-14 h-7 px-2 rounded-lg border border-amber-500/20 bg-[#0a1018] text-[13px] font-semibold text-amber-400 text-right outline-none focus:border-amber-400/50 focus:shadow-[0_0_8px_rgba(251,191,36,0.12)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden relative flex-shrink-0">
                    <motion.div
                      key={`${item.id}-${speedMode ? 'speed' : 'progress'}`}
                      animate={{ width: speedMode ? `${((currentSpeed - limits.min) / (limits.max - limits.min)) * 100}%` : `${item.progress}%` }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`absolute inset-y-0 left-0 rounded-full ${speedMode ? 'bg-gradient-to-r from-amber-500/50 to-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.3)]' : 'bg-gradient-to-r from-teal-500/50 via-teal-400 to-teal-500/60 shadow-[0_0_8px_rgba(14,211,165,0.4)]'}`}
                    />
                  </div>

                  {speedMode && (
                    <div className="flex items-center justify-between -mt-0.5">
                      <span className="text-[9px] text-slate-600 font-mono">{limits.min}</span>
                      <span className="text-[9px] text-slate-600 font-mono">{limits.max}</span>
                    </div>
                  )}

                  {speedMode && (
                    <div className="h-[15px]" />
                  )}

                  {!speedMode && (
                    <div className="flex gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => void handleJointMove(item.id, 'up')}
                        className={`flex-1 h-7 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.96] ${
                          isActiveUp
                            ? 'bg-emerald-500/30 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40'
                        }`}
                      >
                        {isActiveUp ? (
                          <StopCircle className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                        ) : (
                          item.id === 'bed_lateral_joint' ? <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className="text-[9px] font-semibold text-emerald-400/80 tracking-wide uppercase">{isActiveUp ? 'Stop' : item.id === 'bed_front_back_joint' ? '前移' : item.id === 'bed_tilt_joint' ? '前倾' : item.id === 'bed_lateral_joint' ? '左倾' : item.id === 'bed_panel_back_joint' || item.id === 'bed_head_board_joint' || item.id === 'bed_panel_left_leg_joint' || item.id === 'bed_panel_left_leg_lower_joint' || item.id === 'bed_panel_right_leg_joint' || item.id === 'bed_panel_right_leg_lower_joint' ? '上折' : '上升'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleJointMove(item.id, 'down')}
                        className={`flex-1 h-7 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.96] ${
                          isActiveDown
                            ? 'bg-emerald-500/30 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40'
                        }`}
                      >
                        {isActiveDown ? (
                          <StopCircle className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                        ) : (
                          item.id === 'bed_lateral_joint' ? <ArrowRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className="text-[9px] font-semibold text-emerald-400/80 tracking-wide uppercase">{isActiveDown ? 'Stop' : item.id === 'bed_front_back_joint' ? '后移' : item.id === 'bed_tilt_joint' ? '后倾' : item.id === 'bed_lateral_joint' ? '右倾' : item.id === 'bed_panel_back_joint' || item.id === 'bed_head_board_joint' || item.id === 'bed_panel_left_leg_joint' || item.id === 'bed_panel_left_leg_lower_joint' || item.id === 'bed_panel_right_leg_joint' || item.id === 'bed_panel_right_leg_lower_joint' ? '下折' : '下降'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {speedMode && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="shrink-0 pt-2 mt-1.5 border-t border-white/[0.06] px-1"
          >
            <button
              type="button"
              onClick={() => {
                Object.entries(DEFAULT_SPEEDS).forEach(([joint, speed]) => {
                  setBedJointSpeed(joint, speed);
                });
              }}
              className="w-full py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[10px] font-medium text-slate-400 hover:text-amber-400 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all tracking-wide uppercase flex items-center justify-center gap-1"
            >
              <Gauge className="w-3 h-3" />
              重置默认速度
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
