
import React, { useState, useRef } from 'react';
import { useStore } from '../../store';
import {
  Keyboard, Camera, RotateCw, Battery, ChevronUp, ChevronDown, Move, RefreshCw, Ruler, Tag, Trash2, Download, Upload, Star, Pencil, ArrowUp, ArrowDown
} from 'lucide-react';
import clsx from 'clsx';
import { CoordinatePanel } from '../CoordinatePanel';

// Reusable components from RightPanel - consider moving to a shared UI folder
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-3">
    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] shrink-0">{children}</h3>
    <div className="flex-1 h-px bg-gray-800" />
  </div>
);

const SliderControl: React.FC<any> = (props) => {
  // This is a simplified version. The full implementation should be used.
  const { label, value, min, max, unit, onChange } = props;
  return (
    <div>
      <div className="flex justify-between">
        <span>{label}</span>
        <span>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
};

export const SceneTabPanel: React.FC = () => {
  const {
    bed, cArm,
    setBedPosition, setBedBaseRotation,
    setCArmPosition,
    resetBedParts, resetCArmParts,
    exportConfig, importConfig, addToast,
    isMeasuring, toggleMeasuring, measurementMode, setMeasurementMode,
    measurements, removeMeasurement, areaMeasurements, removeAreaMeasurement, angleMeasurements, removeAngleMeasurement, clearMeasurements,
    cameraViews, currentViewIndex, saveCameraView, updateCameraView, moveCameraView, defaultCameraPosition, defaultCameraTarget, setDefaultCameraView, setCurrentViewIndex, syncCurrentViewIndex, loadCameraView, deleteCameraView,
    cameraPosition, cameraTarget,
    isAnnotating, toggleAnnotating, annotations, removeAnnotation, clearAnnotations,
  } = useStore();

  const [showSceneTransform, setShowSceneTransform] = useState(false);
  const [showSceneTools, setShowSceneTools] = useState(false);
  const [showCoordinatePanel, setShowCoordinatePanel] = useState(true);
  const [showBedTransform, setShowBedTransform] = useState(false);
  const [showBedWhole, setShowBedWhole] = useState(true);
  const [showCArmTransform, setShowCArmTransform] = useState(false);
  const [showCArmWhole, setShowCArmWhole] = useState(true);
  const [editingViewIndex, setEditingViewIndex] = useState<number | null>(null);
  const [editingViewName, setEditingViewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSameCameraTuple = (a: [number, number, number], b: [number, number, number], epsilon = 0.01) => (
    Math.abs(a[0] - b[0]) < epsilon &&
    Math.abs(a[1] - b[1]) < epsilon &&
    Math.abs(a[2] - b[2]) < epsilon
  );

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importConfig(JSON.parse(ev.target?.result as string));
        addToast('配置已导入', 'success');
      } catch {
        addToast('配置导入失败', 'error');
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleScreenshot = () => {
    const canvas = (window as any).__threeCanvas as HTMLCanvasElement | undefined ?? document.querySelector('canvas');
    if (canvas) {
      const a = document.createElement('a');
      a.download = `screenshot-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      addToast('截图已保存', 'success');
    } else {
      addToast('截图失败：未找到 3D 画面', 'error');
    }
  };

  const handleSaveCameraView = () => {
    const nextIndex = cameraViews.length;
    const nextName = `视角 ${nextIndex + 1}`;
    saveCameraView(nextName, cameraPosition, cameraTarget);
    setCurrentViewIndex(nextIndex);
    setEditingViewIndex(nextIndex);
    setEditingViewName(nextName);
    addToast('视角已保存，请输入名称', 'success');
  };

  const handleCancelCameraViewSelection = () => {
    setCurrentViewIndex(-1);
    addToast('已取消当前视角选中', 'info');
  };

  const handleRenameCameraView = (index: number) => {
    const nextName = editingViewName.trim();
    if (!nextName) {
      addToast('视角名称不能为空', 'warning');
      return;
    }
    updateCameraView(index, { name: nextName });
    setEditingViewIndex(null);
    setEditingViewName('');
    addToast('视角已重命名', 'success');
  };

  const handleSetDefaultCameraView = (index: number) => {
    const view = cameraViews[index];
    if (!view) return;
    setDefaultCameraView(view.position, view.target);
    addToast(`已设为默认视角: ${view.name || `视角 ${index + 1}`}`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {([
          { label: '场景位移', Icon: Keyboard, color: 'blue', active: showSceneTransform, onClick: () => { setShowSceneTransform(v => !v); addToast(`场景位移已${showSceneTransform ? '隐藏' : '显示'}`, 'info'); } },
          { label: '实用工具', Icon: Camera, color: 'green', active: showSceneTools, onClick: () => { setShowSceneTools(v => !v); addToast(`实用工具已${showSceneTools ? '隐藏' : '显示'}`, 'info'); } },
          { label: '待开发', Icon: RotateCw, color: 'purple', active: false, onClick: () => addToast('该功能待开发', 'info') },
          { label: '待开发', Icon: Battery, color: 'yellow', active: false, onClick: () => addToast('该功能待开发', 'info') },
        ]).map(({ label, Icon, color, active, onClick }, index) => (
          <button key={`${label}-${index}`} onClick={onClick} className={clsx(
            'py-2.5 rounded-lg border transition-all flex flex-col items-center gap-1 group relative overflow-hidden',
            active ? `border-${color}-400 shadow-lg` : `border-${color}-700 hover:border-${color}-500`,
            `bg-gradient-to-br from-${color}-900/40 to-${color}-800/20`,
          )}>
            <Icon size={18} className={`text-${color}-400 group-hover:text-${color}-300`} />
            <span className={`text-[10px] font-bold text-${color}-300`}>{label}</span>
          </button>
        ))}
      </div>

      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCoordinatePanel(v => !v)}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all',
            showCoordinatePanel ? 'bg-gray-800 text-neon-cyan border-b border-gray-700' : 'bg-gray-900 text-gray-400 hover:text-gray-200',
          )}
        >
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />3D 坐标面板</span>
          {showCoordinatePanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showCoordinatePanel && <div className="p-3 bg-gray-900/40"><CoordinatePanel /></div>}
      </div>

      {showSceneTransform && (
        <div className="space-y-3 p-4 bg-gray-900/60 rounded-xl border border-blue-900/50">
          <SectionTitle>场景位移</SectionTitle>
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => setShowBedTransform(v => !v)} className={clsx('w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all', showBedTransform ? 'bg-blue-900/40 text-blue-300 border-b border-blue-800' : 'bg-gray-800/60 text-gray-400 hover:text-gray-200')}>
              <span className="flex items-center gap-2"><Move size={13} />手术床位移</span>
              {showBedTransform ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showBedTransform && (
              <div className="p-3 space-y-3 bg-gray-900/60">
                <div className="border border-blue-900/40 rounded-lg overflow-hidden">
                  <button onClick={() => setShowBedWhole(v => !v)} className={clsx('w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold transition-all', showBedWhole ? 'bg-blue-900/30 text-blue-200 border-b border-blue-900/40' : 'bg-gray-800/40 text-gray-400 hover:text-gray-200')}>
                    <span>整体</span>{showBedWhole ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showBedWhole && (
                    <div className="p-3 space-y-3">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">平移</div>
                      <SliderControl label="X" value={bed.x} min={-20000} max={20000} step={10} decimals={0} unit="mm" centered onChange={(v: number) => setBedPosition('x', v)} />
                      <SliderControl label="Y" value={bed.y || 0} min={-5000} max={5000} step={10} decimals={0} unit="mm" centered onChange={(v: number) => setBedPosition('y', v)} />
                      <SliderControl label="Z" value={bed.z || 0} min={-20000} max={20000} step={10} decimals={0} unit="mm" centered onChange={(v: number) => setBedPosition('z', v)} />
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-2">旋转</div>
                      <SliderControl label="X" value={bed.rotX || 0} min={-180} max={180} unit="°" centered onChange={(v: number) => setBedPosition('rotX', v)} />
                      <SliderControl label="Y" value={bed.rotY || 0} min={-180} max={180} unit="°" centered onChange={(v: number) => setBedPosition('rotY', v)} />
                      <SliderControl label="Z" value={bed.baseRotation?.z ?? 0} min={-180} max={180} unit="°" centered onChange={(v: number) => setBedBaseRotation('z', v)} />
                    </div>
                  )}
                </div>
                <button onClick={() => { resetBedParts(); addToast('手术床已重置', 'info'); }} className="w-full py-2 rounded-lg border border-blue-800 bg-blue-900/20 text-blue-300 hover:bg-blue-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-all">
                  <RefreshCw size={12} />重置手术床
                </button>
              </div>
            )}
          </div>
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => setShowCArmTransform(v => !v)} className={clsx('w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all', showCArmTransform ? 'bg-purple-900/40 text-purple-300 border-b border-purple-800' : 'bg-gray-800/60 text-gray-400 hover:text-gray-200')}>
              <span className="flex items-center gap-2"><RotateCw size={13} />C臂位移</span>
              {showCArmTransform ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showCArmTransform && (
              <div className="p-3 space-y-3 bg-gray-900/60">
                <div className="border border-purple-900/40 rounded-lg overflow-hidden">
                  <button onClick={() => setShowCArmWhole(v => !v)} className={clsx('w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold transition-all', showCArmWhole ? 'bg-purple-900/30 text-purple-200 border-b border-purple-900/40' : 'bg-gray-800/40 text-gray-400 hover:text-gray-200')}>
                    <span>整体</span>{showCArmWhole ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showCArmWhole && (
                    <div className="p-3 space-y-3">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">平移</div>
                      <SliderControl label="X" value={cArm.x || 0} min={-20000} max={20000} step={10} decimals={0} unit="mm" centered onChange={(v: number) => setCArmPosition('x', v)} />
                      <SliderControl label="Y" value={cArm.y || 0} min={-5000} max={5000} step={10} decimals={0} unit="mm" centered onChange={(v: number) => setCArmPosition('y', v)} />
                      <SliderControl label="Z" value={cArm.z || 0} min={-20000} max={20000} step={10} decimals={0} unit="mm" centered onChange={(v: number) => setCArmPosition('z', v)} />
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-2">旋转（整体姿态）</div>
                      <SliderControl label="X（俯仰）" value={cArm.caud ?? 0} min={-90} max={90} unit="°" centered onChange={(v: number) => setCArmPosition('caud', v)} />
                      <SliderControl label="Y（偏航）" value={cArm.rao ?? 0} min={-180} max={180} unit="°" centered onChange={(v: number) => setCArmPosition('rao', v)} />
                      <SliderControl label="Z（滚转）" value={cArm.rotZ ?? 0} min={-180} max={180} unit="°" centered onChange={(v: number) => setCArmPosition('rotZ', v)} />
                    </div>
                  )}
                </div>
                <button onClick={() => { resetCArmParts(); addToast('C臂已重置', 'info'); }} className="w-full py-2 rounded-lg border border-purple-800 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-all">
                  <RefreshCw size={12} />重置C臂
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showSceneTools && (
        <div className="space-y-4">
          <SectionTitle>场景工具</SectionTitle>
          <div className="space-y-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">测量模式</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['distance', 'area', 'angle'] as const).map((mode) => {
                const labels = { distance: '距离', area: '面积', angle: '角度' };
                return <button key={mode} onClick={() => setMeasurementMode(mode)} className={clsx('py-1.5 rounded-lg border text-[11px] font-bold transition-all', measurementMode === mode ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500')}>{labels[mode]}</button>;
              })}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { toggleMeasuring(); addToast(isMeasuring ? '测量已停止' : `${measurementMode === 'distance' ? '左键点击两点测距' : measurementMode === 'area' ? '左键点击多点，右键完成面积' : '左键点击三点测角度'}`, 'info'); }} className={clsx('py-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all', isMeasuring ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500')}>
                <Ruler size={14} />{isMeasuring ? '停止测量' : '开始测量'}
              </button>
              <button onClick={() => { toggleAnnotating(); addToast(isAnnotating ? '标注已停止' : '点击3D场景添加标注', 'info'); }} className={clsx('py-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all', isAnnotating ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500')}>
                <Tag size={14} />{isAnnotating ? '停止标注' : '添加标注'}
              </button>
            </div>
          </div>

          {measurements.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[10px] text-cyan-500 uppercase tracking-wider font-bold">距离记录</span><button onClick={clearMeasurements} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={12} /></button></div>
              {measurements.map((m) => <div key={m.id} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 border border-cyan-900/50"><span className="text-xs font-mono text-cyan-300">{m.distance.toFixed(1)} mm</span><button onClick={() => removeMeasurement(m.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={12} /></button></div>)}
            </div>
          )}

          {areaMeasurements.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[10px] text-green-500 uppercase tracking-wider font-bold">面积记录</span><button onClick={clearMeasurements} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={12} /></button></div>
              {areaMeasurements.map((m) => <div key={m.id} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 border border-green-900/50"><span className="text-xs font-mono text-green-300">{m.area.toFixed(0)} mm²</span><button onClick={() => removeAreaMeasurement(m.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={12} /></button></div>)}
            </div>
          )}

          {angleMeasurements.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[10px] text-orange-500 uppercase tracking-wider font-bold">角度记录</span><button onClick={clearMeasurements} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={12} /></button></div>
              {angleMeasurements.map((m) => <div key={m.id} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 border border-orange-900/50"><span className="text-xs font-mono text-orange-300">{m.angle.toFixed(1)}°</span><button onClick={() => removeAngleMeasurement(m.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={12} /></button></div>)}
            </div>
          )}

          {annotations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between"><SectionTitle>标注列表</SectionTitle><button onClick={clearAnnotations} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={12} /></button></div>
              {annotations.map((a, i) => <div key={a.id} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 border border-gray-800"><span className="text-xs text-gray-300 truncate flex-1">{a.text || `标注 ${i + 1}`}</span><button onClick={() => removeAnnotation(a.id)} className="text-gray-600 hover:text-red-400 transition-colors ml-2"><Trash2 size={12} /></button></div>)}
            </div>
          )}

          <div className="space-y-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">截图</div>
            <button onClick={handleScreenshot} className="w-full py-2.5 rounded-lg border border-green-700 bg-green-900/20 text-green-300 hover:bg-green-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-all"><Camera size={14} />保存3D截图</button>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">配置</div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { exportConfig(); addToast('配置已导出', 'success'); }} className="py-2.5 rounded-lg border border-gray-700 bg-gray-900 text-gray-300 hover:border-neon-cyan hover:text-neon-cyan text-xs font-bold flex items-center justify-center gap-2 transition-all"><Download size={13} />导出</button>
              <button onClick={() => fileInputRef.current?.click()} className="py-2.5 rounded-lg border border-gray-700 bg-gray-900 text-gray-300 hover:border-neon-cyan hover:text-neon-cyan text-xs font-bold flex items-center justify-center gap-2 transition-all"><Upload size={13} />导入</button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2"><div className="text-[10px] text-gray-500 uppercase tracking-wider">相机视角</div>{currentViewIndex >= 0 && <button onClick={handleCancelCameraViewSelection} className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200">取消选中</button>}</div>
            {cameraViews.length === 0 && <div className="text-[11px] text-gray-600 text-center py-2">暂无已保存视角</div>}
            {cameraViews.map((v, i) => {
              const isActive = currentViewIndex === i;
              const isEditing = editingViewIndex === i;
              const isDefault = isSameCameraTuple(v.position, defaultCameraPosition) && isSameCameraTuple(v.target, defaultCameraTarget);
              return (
                <div key={v.id} className={clsx('rounded-lg px-3 py-2 border transition-colors space-y-2', isActive ? 'bg-neon-cyan/8 border-neon-cyan/50' : isDefault ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-gray-900 border-gray-800')}>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <input autoFocus value={editingViewName} onChange={(e) => setEditingViewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCameraView(i); if (e.key === 'Escape') { setEditingViewIndex(null); setEditingViewName(''); } }} onBlur={() => handleRenameCameraView(i)} className="flex-1 h-7 px-2 rounded border border-neon-cyan/40 bg-gray-950 text-xs text-gray-100 outline-none" />
                    ) : (
                      <button onClick={() => { if (isActive) { handleCancelCameraViewSelection(); return; } loadCameraView(i); addToast(`已加载: ${v.name || `视角 ${i + 1}`}`, 'info'); }} onDoubleClick={() => { setEditingViewIndex(i); setEditingViewName(v.name || `视角 ${i + 1}`); }} className={clsx('flex-1 text-left text-xs transition-colors truncate', isActive ? 'text-neon-cyan' : isDefault ? 'text-yellow-200 hover:text-yellow-100' : 'text-gray-300 hover:text-neon-cyan')} title={isDefault ? '默认视角，双击可重命名' : '双击可重命名'}>{v.name || `视角 ${i + 1}`}</button>
                    )}
                    {isDefault && <span className="shrink-0 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-300">默认</span>}
                    <button onClick={() => handleSetDefaultCameraView(i)} className={clsx('transition-colors', isDefault ? 'text-yellow-300' : 'text-gray-500 hover:text-yellow-300')} title="设为默认视角"><Star size={12} fill={isDefault ? 'currentColor' : 'none'} /></button>
                    <button onClick={() => { setEditingViewIndex(i); setEditingViewName(v.name || `视角 ${i + 1}`); }} className="text-gray-500 hover:text-neon-cyan transition-colors" title="重命名"><Pencil size={12} /></button>
                    <button onClick={() => moveCameraView(i, i - 1)} disabled={i === 0} className="text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="上移"><ArrowUp size={12} /></button>
                    <button onClick={() => moveCameraView(i, i + 1)} disabled={i === cameraViews.length - 1} className="text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="下移"><ArrowDown size={12} /></button>
                    <button onClick={() => { deleteCameraView(i); addToast('视角已删除', 'info'); }} className="text-gray-600 hover:text-red-400 transition-colors" title="删除"><Trash2 size={12} /></button>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">P[{v.position.map((n) => n.toFixed(2)).join(', ')}] T[{v.target.map((n) => n.toFixed(2)).join(', ')}]</div>
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={handleSaveCameraView} className="w-full py-2 rounded-lg border border-dashed border-gray-700 text-xs text-gray-500 hover:border-neon-cyan hover:text-neon-cyan transition-all">+ 新建当前视角</button>
              <button onClick={() => { if (currentViewIndex < 0 || !cameraViews[currentViewIndex]) { addToast('请先选中一个视角', 'warning'); return; } updateCameraView(currentViewIndex, { position: cameraPosition, target: cameraTarget, }); syncCurrentViewIndex(cameraPosition, cameraTarget); addToast(`已更新: ${cameraViews[currentViewIndex].name || `视角 ${currentViewIndex + 1}`}`, 'success'); }} disabled={currentViewIndex < 0 || !cameraViews[currentViewIndex]} className="w-full py-2 rounded-lg border border-gray-700 text-xs text-gray-500 hover:border-neon-cyan hover:text-neon-cyan transition-all disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-700 disabled:hover:border-gray-800 disabled:hover:text-gray-700">更新选中视角</button>
            </div>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
    </div>
  );
};
