import { useStore } from '../store';

// 坐标面板：把手术床和 C 臂的关键位置、角度集中展示出来。

const fmt = (v: number, d = 0) => v.toFixed(d);

interface CoordRowProps {
  label: string;
  x: number;
  y: number;
  z: number;
  accent?: string;
}

const CoordRow: React.FC<CoordRowProps> = ({ label, x, y, z, accent = '#00ffff' }) => (
  <div className="flex items-center gap-2 py-1 border-b border-gray-800/60 last:border-0">
    <span className="text-[10px] text-gray-400 w-14 shrink-0">{label}</span>
    <div className="flex gap-2 font-mono text-[11px]">
      {([['X', x], ['Y', y], ['Z', z]] as [string, number][]).map(([axis, val]) => (
        <span key={axis} className="flex items-center gap-0.5">
          <span className="text-[9px] font-bold" style={{ color: accent }}>{axis}</span>
          <span className="text-gray-200">{fmt(val)}</span>
        </span>
      ))}
    </div>
  </div>
);

const AngleRow: React.FC<{ label: string; values: [string, number][]; accent?: string }> = ({ label, values, accent = '#00ffff' }) => (
  <div className="flex items-center gap-2 py-1 border-b border-gray-800/60 last:border-0">
    <span className="text-[10px] text-gray-400 w-14 shrink-0">{label}</span>
    <div className="flex gap-2 font-mono text-[11px]">
      {values.map(([key, val]) => (
        <span key={key} className="flex items-center gap-0.5">
          <span className="text-[9px] font-bold" style={{ color: accent }}>{key}</span>
          <span className="text-gray-200">{fmt(val, 1)}°</span>
        </span>
      ))}
    </div>
  </div>
);

const ScalarRow: React.FC<{ label: string; values: [string, number, string?][]; accent?: string; decimals?: number }> = ({
  label,
  values,
  accent = '#00ffff',
  decimals = 0,
}) => (
  <div className="flex items-center gap-2 py-1 border-b border-gray-800/60 last:border-0">
    <span className="text-[10px] text-gray-400 w-14 shrink-0">{label}</span>
    <div className="flex gap-2 font-mono text-[11px] flex-wrap">
      {values.map(([key, val, unit]) => (
        <span key={key} className="flex items-center gap-0.5">
          <span className="text-[9px] font-bold" style={{ color: accent }}>{key}</span>
          <span className="text-gray-200">{fmt(val, decimals)}{unit ?? ''}</span>
        </span>
      ))}
    </div>
  </div>
);

const VisibilityToggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color: string;
}> = ({ label, checked, onChange, color }) => (
  <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 cursor-pointer">
    <span className="text-[10px] text-gray-300 font-semibold">{label}</span>
    <span className="flex items-center gap-2">
      <span className="text-[9px] text-gray-500">{checked ? '显示' : '隐藏'}</span>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className="h-5 w-9 rounded-full border transition-colors"
          style={{
            background: checked ? `${color}22` : '#111827',
            borderColor: checked ? `${color}66` : '#374151',
          }}
        />
        <span
          className="absolute left-0.5 h-4 w-4 rounded-full transition-transform"
          style={{
            background: checked ? color : '#6b7280',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </span>
    </span>
  </label>
);

const DeviceBlock: React.FC<{
  title: string;
  color: string;
  children: React.ReactNode;
}> = ({ title, color, children }) => (
  <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${color}33` }}>
    <div
      className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest"
      style={{ background: `${color}12`, color }}
    >
      {title}
    </div>
    <div className="px-3 py-1 bg-gray-900/60">
      {children}
    </div>
  </div>
);

export const CoordinatePanel: React.FC = () => {
  const {
    bed,
    cArm,
    showBedModelInScene,
    showCArmModelInScene,
    setShowBedModelInScene,
    setShowCArmModelInScene,
  } = useStore();

  const bedRoot = {
    x: bed.x || 0,
    y: bed.y || 0,
    z: bed.z || 0,
  };
  const bedSurface = {
    x: bedRoot.x + (bed.surfaceOffset?.x || 0),
    y: bedRoot.y + (bed.surfaceOffset?.y || 0),
    z: bedRoot.z + (bed.surfaceOffset?.z || 0) + (bed.frontBackPosition || 0),
  };
  const bedBase = {
    x: bedRoot.x + (bed.baseOffset?.x || 0),
    y: bedRoot.y + (bed.baseOffset?.y || 0),
    z: bedRoot.z + (bed.baseOffset?.z || 0),
  };

  const cArmRoot = {
    x: cArm.x || 0,
    y: cArm.y || 0,
    z: cArm.z || 0,
  };
  const cArmHeadControl = {
    x: cArmRoot.x + (cArm.headOffset?.x || 0),
    y: cArmRoot.y + (cArm.headOffset?.y || 0) + (cArm.frontBackTranslation || 0),
    z: cArmRoot.z + (cArm.headOffset?.z || 0) + (cArm.cArmHeightJoint || 0),
  };
  const cArmRingControl = {
    x: cArmHeadControl.x + (cArm.cArmRingOffset?.x || 0),
    y: cArmHeadControl.y + (cArm.cArmRingOffset?.y || 0),
    z: cArmHeadControl.z + (cArm.cArmRingOffset?.z || 0),
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-2 space-y-2">
        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 px-1">3D 场景显示</div>
        <VisibilityToggle
          label="手术床模型"
          checked={showBedModelInScene}
          onChange={setShowBedModelInScene}
          color="#60a5fa"
        />
        <VisibilityToggle
          label="C 臂模型"
          checked={showCArmModelInScene}
          onChange={setShowCArmModelInScene}
          color="#a78bfa"
        />
      </div>

      <DeviceBlock title="手术床" color="#60a5fa">
        <CoordRow label="根节点" x={bedRoot.x} y={bedRoot.y} z={bedRoot.z} accent="#60a5fa" />
        <CoordRow label="床面" x={bedSurface.x} y={bedSurface.y} z={bedSurface.z} accent="#93c5fd" />
        <CoordRow label="底座" x={bedBase.x} y={bedBase.y} z={bedBase.z} accent="#93c5fd" />
        <AngleRow
          label="倾斜"
          accent="#93c5fd"
          values={[["T", bed.trendelenburg || 0], ["L", bed.lateral || 0]]}
        />
      </DeviceBlock>

      <DeviceBlock title="C 臂" color="#a78bfa">
        <CoordRow label="底座" x={cArmRoot.x} y={cArmRoot.y} z={cArmRoot.z} accent="#a78bfa" />
        <CoordRow label="悬臂头" x={cArmHeadControl.x} y={cArmHeadControl.y} z={cArmHeadControl.z} accent="#c4b5fd" />
        <CoordRow label="C 环" x={cArmRingControl.x} y={cArmRingControl.y} z={cArmRingControl.z} accent="#c4b5fd" />
        <AngleRow
          label="旋转"
          accent="#c4b5fd"
          values={[["R", cArm.cArmRotation || 0], ["F", cArm.cArmFrontBackRotation || 0]]}
        />
        <ScalarRow
          label="平移"
          accent="#c4b5fd"
          values={[["Y", (cArm.frontBackTranslation ?? 150) - 150, 'mm'], ["Z", cArm.cArmHeightJoint || 0, 'mm']]}
        />
      </DeviceBlock>
    </div>
  );
};
