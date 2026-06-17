
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import clsx from 'clsx';
import {
  RotateCw, Power, Battery, Camera, Keyboard,
  Download, Upload, ChevronDown, ChevronUp,
  Ruler, Tag, RefreshCw, Trash2, Move, Pencil, ArrowUp, ArrowDown, Star, Server, Activity,
} from 'lucide-react';
import type { BedState, SpaceDeviceInfo } from '../../types';
import {
  fetchBedStatusList,
  applyBedStatusById,
  fetchDemoList,
  applyDemoById,
  setBedJointMove,
  type BedStatusPoseItem,
} from '../../store/services/api';

// Reusable components moved from RightPanel.tsx
interface SliderProps {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; decimals?: number;
  onChange: (v: number) => void; centered?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  accent?: string;
  speed?: number;
  speedUnit?: string;
  onSpeedChange?: (v: number) => void;
  coordinated?: boolean;
  onCoordinatedChange?: (checked: boolean) => void;
  live?: boolean;
  displayValue?: number;
  displayUnit?: string;
  displayDecimals?: number;
}
const SliderControl: React.FC<SliderProps> = ({
  label, value, min, max, step = 1, unit = '', decimals = 0,
  onChange, centered = false, accent = 'accent-neon-cyan',
  onInteractionStart, onInteractionEnd,
  speed, speedUnit = '', onSpeedChange,
  coordinated, onCoordinatedChange,
  live = false,
  displayValue,
  displayUnit,
  displayDecimals,
}) => {
  const [draftValue, setDraftValue] = useState(value);
  const isInteractingRef = useRef(false);
  const onInteractionStartRef = useRef(onInteractionStart);
  const onInteractionEndRef = useRef(onInteractionEnd);

  useEffect(() => {
    onInteractionStartRef.current = onInteractionStart;
    onInteractionEndRef.current = onInteractionEnd;
  }, [onInteractionStart, onInteractionEnd]);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isInteractingRef.current) {
        isInteractingRef.current = false;
        onInteractionEndRef.current?.();
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  const commitValue = useCallback((next: number) => {
    onChange(next);
  }, [onChange]);

  const handlePointerDown = useCallback(() => {
    isInteractingRef.current = true;
    onInteractionStartRef.current?.();
  }, []);

  const shownValue = displayValue ?? draftValue;
  const shownUnit = displayUnit ?? unit;
  const shownDecimals = displayDecimals ?? decimals;

  return (
    <div className="group">
      <div className="flex justify-between items-center gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[10px] text-gray-400 font-medium shrink-0">{label}</span>
          {typeof speed === 'number' && onSpeedChange && (
            <label className="flex items-center gap-1 min-w-0">
              <span className="text-[9px] text-gray-500 shrink-0">速:</span>
              <input
                type="number"
                min={0}
                step={1}
                value={speed}
                onChange={(e) => onSpeedChange(Number(e.target.value) || 0)}
                className="w-12 h-5 px-1 rounded border border-gray-700 bg-gray-950 text-[10px] font-mono text-gray-200 outline-none focus:border-neon-cyan"
              />
            </label>
          )}
          {typeof coordinated === 'boolean' && onCoordinatedChange && (
            <label className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] text-gray-500">协:</span>
              <input
                type="checkbox"
                checked={coordinated}
                onChange={(e) => onCoordinatedChange(e.target.checked)}
                className="h-3 w-3 rounded border border-gray-600 bg-gray-950 text-neon-cyan focus:ring-0"
              />
            </label>
          )}
        </div>
        <span className="text-[10px] font-mono font-bold text-neon-cyan bg-neon-cyan/5 px-1.5 py-0.5 rounded border border-neon-cyan/20 shrink-0">
          {shownDecimals > 0 ? shownValue.toFixed(shownDecimals) : shownValue}{shownUnit}
        </span>
      </div>
      <div className="h-7 bg-gray-950 rounded border border-gray-800 group-hover:border-gray-700 flex items-center px-2 relative transition-colors">
        {centered && <div className="absolute left-1/2 top-1 bottom-1 w-px bg-gray-700" />}
        <input type="range" min={min} max={max} step={step} value={draftValue}
          onChange={(e) => {
            const next = parseFloat(e.target.value);
            setDraftValue(next);
            if (live) commitValue(next);
          }}
          onMouseUp={() => { if (!live) commitValue(draftValue); }}
          onTouchEnd={() => { if (!live) commitValue(draftValue); }}
          onKeyUp={() => { if (!live) commitValue(draftValue); }}
          onPointerDown={handlePointerDown}
          className={`w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer ${accent}`}
        />
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-3">
    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] shrink-0">{children}</h3>
    <div className="flex-1 h-px bg-gray-800" />
  </div>
);

const JointMoveButtons: React.FC<{
  joint: string;
  speed: number;
  loadingJoint: string | null;
  onMove: (joint: string, speed: number) => Promise<void>;
}> = ({ joint, speed, loadingJoint, onMove }) => {
  const disabled = loadingJoint !== null;
  const loading = loadingJoint === joint;
  const pressStartTimeRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const handlePointerDown = (direction: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    (e.target as HTMLButtonElement).setPointerCapture(e.pointerId);
    pressStartTimeRef.current = Date.now();
    isLongPressRef.current = false;
    void onMove(joint, direction * Math.abs(speed));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (pressStartTimeRef.current !== null) {
      const pressDuration = Date.now() - pressStartTimeRef.current;
      if (pressDuration >= 200) {
        isLongPressRef.current = true;
      }
      pressStartTimeRef.current = null;
    }
    if (isLongPressRef.current) {
      void onMove(joint, 0);
    }
  };

  const handleClick = (direction: number) => () => {
    void onMove(joint, direction * Math.abs(speed));
  };

  return (
    <div className="mt-2 w-full space-y-1.5">
      <div className="w-full rounded-xl border border-gray-800 bg-gray-950/70 p-1.5">
        <div className="grid w-full grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={handleClick(1)}
            onPointerDown={handlePointerDown(1)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-sky-500/70 bg-sky-400/20 px-3 text-[12px] font-bold text-sky-100 hover:border-sky-300 hover:bg-sky-400/30 disabled:opacity-50 select-none"
          >
            上升
          </button>
          <button
            type="button"
            onClick={() => void onMove(joint, 0)}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-sky-500/70 bg-sky-400/20 px-3 text-[12px] font-bold text-sky-100 hover:border-sky-300 hover:bg-sky-400/30 disabled:opacity-50"
          >
            停止
          </button>
          <button
            type="button"
            onClick={handleClick(-1)}
            onPointerDown={handlePointerDown(-1)}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-sky-500/70 bg-sky-400/20 px-3 text-[12px] font-bold text-sky-100 hover:border-sky-300 hover:bg-sky-400/30 disabled:opacity-50 select-none"
          >
            下降
          </button>
        </div>
      </div>
      {loading && <span className="block text-[10px] text-gray-400">发送中…</span>}
    </div>
  );
};

const bedHeightToDisplayMm = (height: number) => height - 1030;

const BED_JOINT_MAPPING_MODE = (import.meta.env.VITE_BED_JOINT_MAPPING_MODE === 'legacy' ? 'legacy' : 'spec') as 'legacy' | 'spec';
const HEIGHT_MOVE_JOINT = BED_JOINT_MAPPING_MODE === 'legacy' ? 'bed_front_back_joint' : 'bed_height_joint';
const FRONT_BACK_MOVE_JOINT = BED_JOINT_MAPPING_MODE === 'legacy' ? 'bed_height_joint' : 'bed_front_back_joint';

const BedManualWindow: React.FC<{
  bed: BedState;
  setBedPosition: (k: keyof BedState | Partial<BedState>, v?: number) => void;
}> = ({
  bed,
  setBedPosition,
}) => {
  const { addToast, setInteractionState, setInteractingPart, interactionState, backendConnectionStatus, backendLatency } = useStore();
  const [loadingJoint, setLoadingJoint] = useState<string | null>(null);
  const [speeds, setSpeeds] = useState({
    height: 400,
    backrestAngle: 10000,
    leftLegAngle: 400,
    rightLegAngle: 400,
    trendelenburg: 400,
    lateral: 400,
    frontBackPosition: 2500,
  });

  const [coordinated, setCoordinated] = useState({
    height: false,
    trendelenburg: false,
    lateral: false,
    frontBackPosition: false,
  });

  const setSpeed = (key: keyof typeof speeds, value: number) => {
    setSpeeds((prev) => ({ ...prev, [key]: value }));
  };

  const setCoordination = (key: keyof typeof coordinated, checked: boolean) => {
    setCoordinated((prev) => ({ ...prev, [key]: checked }));
  };

  const sendJointMove = async (joint: string, speed: number) => {
    setLoadingJoint(joint);
    try {
      const result = await setBedJointMove(joint, speed);
      if (!result.ok) {
        addToast(`关节动作失败：${result.error || 'unknown_error'}`, 'error');
        return;
      }
      addToast(`已发送 ${joint} 速度 ${speed}`, 'success');
    } finally {
      setLoadingJoint(null);
    }
  };

  const bedHeightDisplayMm = useMemo(() => bedHeightToDisplayMm(bed.height), [bed.height]);

  const syncStateText = useMemo(() => {
    if (interactionState === 'USER_INTERACTING') return '用户操作中（暂停回读）';
    if (interactionState === 'AWAITING_BACKEND_UPDATE') return '等待后端回流';
    if (backendConnectionStatus === 'degraded') return `后端延迟较高（${backendLatency}ms）`;
    if (backendConnectionStatus === 'disconnected') return '后端未连接';
    return `实时同步中（${backendLatency}ms）`;
  }, [interactionState, backendConnectionStatus, backendLatency]);

  const syncStateTone = interactionState === 'USER_INTERACTING'
    ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
    : interactionState === 'AWAITING_BACKEND_UPDATE'
      ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
      : backendConnectionStatus === 'disconnected'
        ? 'border-red-500/50 bg-red-500/10 text-red-200'
        : backendConnectionStatus === 'degraded'
          ? 'border-orange-500/50 bg-orange-500/10 text-orange-200'
          : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200';

  return (
    <div className="space-y-3 p-4 bg-gray-900/60 rounded-xl border border-green-900/50">
      <SectionTitle>手动控制</SectionTitle>

      <div className={clsx('flex items-center justify-between rounded-lg border px-2 py-1 text-[10px] font-medium', syncStateTone)}>
        <span>同步状态</span>
        <span>{syncStateText}</span>
      </div>

      <div>
        <SliderControl label="床高" value={bed.height} min={1030} max={1200} unit="mm" centered live
          displayValue={bedHeightDisplayMm} displayUnit="mm" displayDecimals={0}
          speed={speeds.height} speedUnit="mm/s" onSpeedChange={(v) => setSpeed('height', v)}
          coordinated={coordinated.height} onCoordinatedChange={(checked) => setCoordination('height', checked)}
          onChange={(v) => setBedPosition('height', v)}
          onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('bed_height'); }}
          onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }} />
        <JointMoveButtons joint={HEIGHT_MOVE_JOINT} speed={speeds.height} loadingJoint={loadingJoint} onMove={sendJointMove} />
      </div>

      <div>
        <SliderControl label="前后倾斜" value={bed.trendelenburg} min={-22} max={22} unit="°" centered live
          speed={speeds.trendelenburg} speedUnit="°/s" onSpeedChange={(v) => setSpeed('trendelenburg', v)}
          coordinated={coordinated.trendelenburg} onCoordinatedChange={(checked) => setCoordination('trendelenburg', checked)}
          onChange={(v) => setBedPosition('trendelenburg', v)}
          onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('bed_trendelenburg'); }}
          onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }} />
        <JointMoveButtons joint="bed_tilt_joint" speed={speeds.trendelenburg} loadingJoint={loadingJoint} onMove={sendJointMove} />
      </div>

      <div>
        <SliderControl label="左右倾斜" value={bed.lateral} min={-15} max={15} unit="°" centered live
          speed={speeds.lateral} speedUnit="°/s" onSpeedChange={(v) => setSpeed('lateral', v)}
          coordinated={coordinated.lateral} onCoordinatedChange={(checked) => setCoordination('lateral', checked)}
          onChange={(v) => setBedPosition('lateral', v)}
          onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('bed_lateral'); }}
          onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }} />
        <JointMoveButtons joint="bed_lateral_joint" speed={speeds.lateral} loadingJoint={loadingJoint} onMove={sendJointMove} />
      </div>

      <div>
        <SliderControl label="前后位移" value={bed.frontBackPosition} min={-200} max={200} unit="mm" centered live
          displayValue={bed.frontBackPosition} displayUnit="mm" displayDecimals={0}
          speed={speeds.frontBackPosition} speedUnit="mm/s" onSpeedChange={(v) => setSpeed('frontBackPosition', v)}
          coordinated={coordinated.frontBackPosition} onCoordinatedChange={(checked) => setCoordination('frontBackPosition', checked)}
          onChange={(v) => setBedPosition('frontBackPosition', v)}
          onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('bed_frontBackPosition'); }}
          onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }} />
        <JointMoveButtons joint={FRONT_BACK_MOVE_JOINT} speed={speeds.frontBackPosition} loadingJoint={loadingJoint} onMove={sendJointMove} />
      </div>

      <div>
        <SliderControl label="背板角度" value={bed.backrestAngle} min={-70} max={70} unit="°" centered live
          speed={speeds.backrestAngle} speedUnit="°/s" onSpeedChange={(v) => setSpeed('backrestAngle', v)}
          onChange={(v) => setBedPosition('backrestAngle', v)}
          onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('bed_backrestAngle'); }}
          onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }} />
        <JointMoveButtons joint="bed_panel_back_joint" speed={speeds.backrestAngle} loadingJoint={loadingJoint} onMove={sendJointMove} />
      </div>

      <div>
        <SliderControl label="左腿板" value={bed.leftLegAngle} min={-90} max={90} unit="°" centered live
          speed={speeds.leftLegAngle} speedUnit="°/s" onSpeedChange={(v) => setSpeed('leftLegAngle', v)}
          onChange={(v) => setBedPosition('leftLegAngle', v)}
          onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('bed_leftLegAngle'); }}
          onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }} />
        <JointMoveButtons joint="bed_panel_left_leg_joint" speed={speeds.leftLegAngle} loadingJoint={loadingJoint} onMove={sendJointMove} />
      </div>

      <div>
        <SliderControl label="右腿板" value={bed.rightLegAngle} min={-90} max={90} unit="°" centered live
          speed={speeds.rightLegAngle} speedUnit="°/s" onSpeedChange={(v) => setSpeed('rightLegAngle', v)}
          onChange={(v) => setBedPosition('rightLegAngle', v)}
          onInteractionStart={() => { setInteractionState('USER_INTERACTING'); setInteractingPart('bed_rightLegAngle'); }}
          onInteractionEnd={() => { setInteractionState('AWAITING_BACKEND_UPDATE'); setInteractingPart(null); }} />
        <JointMoveButtons joint="bed_panel_right_leg_joint" speed={speeds.rightLegAngle} loadingJoint={loadingJoint} onMove={sendJointMove} />
      </div>
    </div>
  );
};

const BedPresetWindow: React.FC<{
  onApplied?: () => Promise<void> | void;
}> = ({ onApplied }) => {
  const { addToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);
  const [isTwoColumn, setIsTwoColumn] = useState(false);
  const [presetSource, setPresetSource] = useState<'current' | 'demo'>('current');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Array<{ id: string; item: BedStatusPoseItem }>>([]);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});

  const sortStatusItems = (list: Array<{ id: string; item: BedStatusPoseItem }>) => {
    const priorityOrder = ['zero', 'exchange', 'goup'];
    
    return [...list].sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.id);
      const bPriority = priorityOrder.indexOf(b.id);
      
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      
      const aNum = parseInt(a.id, 10);
      const bNum = parseInt(b.id, 10);
      const aIsNum = !isNaN(aNum);
      const bIsNum = !isNaN(bNum);
      
      if (aIsNum && bIsNum) return aNum - bNum;
      if (aIsNum) return -1;
      if (bIsNum) return 1;
      
      return a.id.localeCompare(b.id, 'zh-CN');
    });
  };
  const filteredItems = useMemo(() => {
    const sourceItems = items;
    const keyword = query.trim().toLowerCase();
    if (!keyword) return sourceItems;
    return sourceItems.filter(({ id, item }) => (
      id.toLowerCase().includes(keyword) || item.name.toLowerCase().includes(keyword)
    ));
  }, [items, query, presetSource]);

  const loadStatusList = useCallback(async (source: 'current' | 'demo' = presetSource) => {
    setLoading(true);
    try {
      const resp = source === 'demo' ? await fetchDemoList() : await fetchBedStatusList();
      if (!resp) {
        setItems([]);
        setBrokenImageIds({});
        addToast(source === 'demo' ? '后端不可达，无法加载 demo 列表' : '后端不可达，无法加载姿态列表', 'warning');
        return;
      }

      if (resp.error) {
        addToast(`${source === 'demo' ? '获取 demo 列表失败' : '获取姿态列表失败'}：${resp.error}`, 'warning');
      }

      const next = sortStatusItems(Object.entries(resp.status).map(([id, item]) => ({ id, item })));
      setItems(next);
      setBrokenImageIds({});

      if (next.length > 0) {
        addToast(`已加载 ${next.length} 个${source === 'demo' ? 'demo' : '姿态'}`, 'success');
      } else {
        addToast('后端返回空数据', 'warning');
      }
    } finally {
      setLoading(false);
    }
  }, [addToast, presetSource]);

  useEffect(() => {
    void loadStatusList();
  }, [loadStatusList]);

  const handleApply = async (id: string) => {
    setApplyingId(id);
    try {
      const result = presetSource === 'demo' ? await applyDemoById(id) : await applyBedStatusById(id);
      if (!result.ok) {
        addToast(result.error ? `应用失败：${result.error}` : '应用失败', 'error');
        return;
      }
      addToast(`已应用${presetSource === 'demo' ? ' demo ' : '姿态 '}${id}`, 'success');
      setLastAppliedId(id);
      if (onApplied) await onApplied();
    } finally {
      setApplyingId(null);
    }
  };

  const cardTone = (id: string) => {
    if (id === 'zero') {
      return 'border-emerald-700/70 bg-emerald-950/20 hover:border-emerald-500/80';
    }
    return 'border-purple-800/60 bg-purple-950/20 hover:border-purple-500/80';
  };

  return (
    <div className="space-y-3 p-4 bg-gray-900/60 rounded-xl border border-purple-900/50">
      <div className="space-y-2">
        <SectionTitle>姿态预设</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPresetSource('current');
              void loadStatusList('current');
            }}
            disabled={loading}
            className={clsx(
              'inline-flex min-w-[96px] justify-center items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition disabled:opacity-60',
              presetSource === 'current'
                ? 'border border-indigo-700 bg-indigo-950/40 text-indigo-200 hover:border-indigo-500'
                : 'border border-gray-700 bg-gray-900/60 text-gray-300 hover:border-indigo-500/60'
            )}
          >
            术士位
          </button>
          <button
            type="button"
            onClick={() => {
              setPresetSource('demo');
              void loadStatusList('demo');
            }}
            className={clsx(
              'inline-flex min-w-[96px] justify-center items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition',
              presetSource === 'demo'
                ? 'border border-purple-700 bg-purple-950/40 text-purple-200 hover:border-purple-500'
                : 'border border-gray-700 bg-gray-900/60 text-gray-300 hover:border-purple-500/60'
            )}
          >
            demo
          </button>
          <button
            type="button"
            onClick={() => setIsTwoColumn((v) => !v)}
            className="inline-flex min-w-[96px] justify-center items-center gap-1.5 rounded-lg border border-indigo-700 bg-indigo-950/40 px-3.5 py-1.5 text-[11px] font-bold text-indigo-200 transition hover:border-indigo-500"
          >
            {isTwoColumn ? '单列' : '双列'}
          </button>
          <button
            type="button"
            onClick={() => void loadStatusList(presetSource)}
            disabled={loading}
            className="inline-flex min-w-[96px] justify-center items-center gap-1.5 rounded-lg border border-purple-700 bg-purple-950/40 px-3.5 py-1.5 text-[11px] font-bold text-purple-200 transition hover:border-purple-500 disabled:opacity-60"
          >
            <RefreshCw size={12} className={clsx(loading && 'animate-spin')} />
            刷新列表
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索姿态名称或ID"
          className="h-8 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2.5 text-[11px] text-gray-200 outline-none focus:border-neon-cyan"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="h-8 rounded-lg border border-gray-700 bg-gray-900 px-2 text-[10px] text-gray-300 hover:border-gray-500"
          >
            清空
          </button>
        )}
      </div>

      <div className={clsx(isTwoColumn ? 'grid grid-cols-2 gap-2 pr-1' : 'space-y-2 -mx-1')}>
        {filteredItems.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/40 px-3 py-5 text-center text-[11px] text-gray-500">
            暂无姿态数据
          </div>
        ) : (
          filteredItems.map(({ id, item }) => (
            <div key={id} className={clsx('rounded-xl border p-3 transition', !isTwoColumn && 'px-4', cardTone(id), lastAppliedId === id && 'ring-1 ring-neon-cyan/70')}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-gray-100 truncate">{item.name}</div>
                  <div className="text-[10px] font-mono text-gray-400">ID: {id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleApply(id)}
                  disabled={applyingId !== null}
                  className="rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-2.5 py-1 text-[11px] font-semibold text-neon-cyan hover:border-neon-cyan disabled:opacity-60"
                >
                  {applyingId === id ? '应用中…' : '应用'}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  {item.image && !brokenImageIds[id] && (
                    <div className={clsx('overflow-hidden rounded-lg border border-gray-700 bg-black/20', isTwoColumn ? 'h-44' : 'h-64')}>
                      <img
                        src={item.image}
                        alt={`${item.name} 姿态图`}
                        className="w-full h-full object-contain bg-gray-950/70"
                        onError={() => {
                          const failedUrl = item.image ?? '';
                          console.warn('[BedPresetWindow] 姿态图片加载失败', {
                            id,
                            name: item.name,
                            image: failedUrl,
                          });
                          setBrokenImageIds((prev) => ({ ...prev, [id]: true }));
                          addToast(`姿态图片加载失败：${item.name}（${id}） ${failedUrl}`, 'warning');
                        }}
                      />
                    </div>
                  )}
                  {item.image && brokenImageIds[id] && (
                    <div className={clsx('rounded-lg border border-dashed border-amber-700/60 bg-amber-950/20 px-3 py-2 text-[10px] text-amber-200/90 flex flex-col items-center justify-center text-center leading-relaxed gap-1', isTwoColumn ? 'h-44' : 'h-64')}>
                      <span>姿态图加载失败，请检查图片地址</span>
                      <span className="max-w-full truncate font-mono text-amber-300/80">
                        {item.image}
                      </span>
                    </div>
                  )}
                  {!item.image && (
                    <div className={clsx('rounded-lg border border-dashed border-gray-700/70 bg-gray-900/40 px-3 py-2 text-[11px] text-gray-300 flex flex-col items-center justify-center text-center leading-relaxed gap-1', isTwoColumn ? 'h-44' : 'h-64')}>
                      <span className="font-medium text-gray-200">当前姿态暂无配图</span>
                      <span className="text-[10px] text-gray-400">可继续直接应用该姿态参数</span>
                    </div>
                  )}
                </div>
                <div className={clsx('col-span-1 flex flex-col justify-center gap-1.5 leading-snug font-mono text-gray-200 text-center', isTwoColumn ? 'text-[10px]' : 'text-[12px]')}> 
                  <div>高: {item.state.bed_height_joint}</div>
                  <div>前后倾: {item.state.bed_tilt_joint}</div>
                  <div>左右倾: {item.state.bed_lateral_joint}</div>
                  <div>前后移: {item.state.bed_front_back_joint}</div>
                  <div>背板: {item.state.bed_panel_back_joint}</div>
                  <div>左腿: {item.state.bed_panel_left_leg_joint}</div>
                  <div>右腿: {item.state.bed_panel_right_leg_joint}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AlarmWindow: React.FC = () => (
  <div className="space-y-3 p-4 bg-gray-900/60 rounded-xl border border-yellow-900/50">
    <SectionTitle>报警信息</SectionTitle>
    {[
      { level: 'warn', text: 'C臂接近机械限位' },
      { level: 'info', text: '手术床电池余量 85%' },
      { level: 'ok',   text: '系统自检通过' },
    ].map(({ level, text }, i) => (
      <div key={i} className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border',
        level === 'warn' ? 'border-yellow-700 bg-yellow-900/20 text-yellow-300' :
        level === 'info' ? 'border-blue-700 bg-blue-900/20 text-blue-300' :
        'border-green-700 bg-green-900/20 text-green-300',
      )}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{
          background: level === 'warn' ? '#facc15' : level === 'info' ? '#60a5fa' : '#4ade80',
        }} />
        {text}
      </div>
    ))}
  </div>
);


export const BedTabPanel: React.FC = () => {
  const {
    bed,
    setBedPosition,
    showPresetPanel,
    togglePresetPanel,
    addToast,
    loadFromBackend,
    loadSpaceDevices,
  } = useStore();

  const [showManualWindow, setShowManualWindow] = useState(false);
  const [showAlarmWindow, setShowAlarmWindow] = useState(false);

  useEffect(() => {
    if (!showManualWindow) return;
    void loadSpaceDevices();
  }, [showManualWindow, loadSpaceDevices]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-carbon-black">
      <div className="p-3 border-b border-gray-800 shrink-0 grid grid-cols-4 gap-2">
        {([
          { label: '手动窗口', Icon: RotateCw, color: 'green', active: showManualWindow, onClick: () => { setShowManualWindow(v => !v); addToast(`手动窗口已${showManualWindow ? '关闭' : '打开'}`, 'info'); } },
          { label: '监控窗口', Icon: Server, color: 'cyan', active: false, onClick: () => addToast('监控窗口待接入', 'info') },
          { label: '预设窗口', Icon: RotateCw, color: 'purple', active: showPresetPanel, onClick: () => togglePresetPanel() },
          { label: '报警窗口', Icon: Battery, color: 'yellow', active: showAlarmWindow, onClick: () => { setShowAlarmWindow(v => !v); addToast(`报警窗口已${showAlarmWindow ? '关闭' : '打开'}`, 'info'); } },
        ]).map(({ label, Icon, color, active, onClick }) => (
          <button key={label} onClick={onClick} className={clsx(
            'py-2 rounded-lg border transition-all flex flex-col items-center gap-1 group relative overflow-hidden',
            active ? `border-${color}-400 shadow-lg` : `border-${color}-700 hover:border-${color}-500`,
            `bg-gradient-to-br from-${color}-900/40 to-${color}-800/20`,
          )}>
            <Icon size={16} className={`text-${color}-400 group-hover:text-${color}-300`} />
            <span className={`text-[10px] font-bold text-${color}-300`}>{label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide pb-24">
        {showManualWindow && <BedManualWindow bed={bed} setBedPosition={setBedPosition} />}
        {showAlarmWindow && <AlarmWindow />}
        {showPresetPanel && (
          <BedPresetWindow onApplied={async () => {
            await loadFromBackend({ silent: false });
          }} />
        )}
      </div>
    </div>
  );
};
