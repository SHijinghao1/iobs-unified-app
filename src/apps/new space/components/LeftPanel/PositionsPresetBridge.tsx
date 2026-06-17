import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { useNewSpaceStore } from '../../store';
import {
  fetchNewSpaceBedStatusList,
  applyNewSpaceBedStatusById,
  fetchNewSpaceDemoList,
  applyNewSpaceDemoById,
  type BedStatusPoseItem,
} from '../../services/presetApi';

interface PositionsPresetBridgeProps {
}

export default function PositionsPresetBridge(_props: PositionsPresetBridgeProps) {
  const addToast = useNewSpaceStore((state) => state.pushToast);
  const loading = useNewSpaceStore((state) => state.presetLoading);
  const applyingId = useNewSpaceStore((state) => state.presetApplyingId);
  const lastAppliedId = useNewSpaceStore((state) => state.presetLastAppliedId);
  const isTwoColumn = useNewSpaceStore((state) => state.presetIsTwoColumn);
  const presetSource = useNewSpaceStore((state) => state.presetSource);
  const query = useNewSpaceStore((state) => state.presetQuery);
  const items = useNewSpaceStore((state) => state.presetItems);
  const keyOrder = useNewSpaceStore((state) => state.presetKeyOrder);
  const brokenImageIds = useNewSpaceStore((state) => state.presetBrokenImageIds);
  const setLoading = useNewSpaceStore((state) => state.setPresetLoading);
  const setApplyingId = useNewSpaceStore((state) => state.setPresetApplyingId);
  const setLastAppliedId = useNewSpaceStore((state) => state.setPresetLastAppliedId);
  const setIsTwoColumn = useNewSpaceStore((state) => state.setPresetIsTwoColumn);
  const setPresetSource = useNewSpaceStore((state) => state.setPresetSource);
  const setQuery = useNewSpaceStore((state) => state.setPresetQuery);
  const setItems = useNewSpaceStore((state) => state.setPresetItems);
  const setKeyOrder = useNewSpaceStore((state) => state.setPresetKeyOrder);
  const setBrokenImageIds = useNewSpaceStore((state) => state.setPresetBrokenImageIds);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter(({ id, item }) => id.toLowerCase().includes(keyword) || item.name.toLowerCase().includes(keyword));
  }, [items, query]);

  const loadStatusList = async (source: 'current' | 'demo' = presetSource) => {
    setLoading(true);
    try {
      const resp = source === 'demo' ? await fetchNewSpaceDemoList() : await fetchNewSpaceBedStatusList();
      if (!resp) {
        setItems([]);
        setBrokenImageIds({});
        addToast(source === 'demo' ? '后端不可达，无法加载 demo 列表' : '后端不可达，无法加载姿态列表', 'warning');
        return;
      }

      if (resp.error) {
        addToast(`${source === 'demo' ? '获取 demo 列表失败' : '获取姿态列表失败'}：${resp.error}`, 'warning');
      }

      const rawEntries: Array<[string, BedStatusPoseItem]> = [];
      for (const id in resp.status) {
        if (Object.prototype.hasOwnProperty.call(resp.status, id)) {
          rawEntries.push([id, resp.status[id]]);
        }
      }
      const itemMap = new Map(rawEntries);
      const order = resp.keyOrder ?? [];
      if (import.meta.env.DEV) {
        console.log('[loadStatusList] keyOrder from API:', order, 'length:', order.length);
        console.log('[loadStatusList] for...in keys (JS sorted):', rawEntries.map(([k]) => k));
      }
      const next = order
        .filter((id) => itemMap.has(id))
        .map((id) => ({ id, item: itemMap.get(id)! }))
        .concat(
          rawEntries.filter(([id]) => !order.includes(id)).map(([id, item]) => ({ id, item }))
        );
      if (import.meta.env.DEV && next.length > 0) {
        console.log('[loadStatusList] final ordered items:', next.map(({ id }) => id));
      }
      setItems(next);
      setKeyOrder(order);
      setBrokenImageIds({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (items.length === 0 && !loading) {
      void loadStatusList();
    }
  }, []);

  const handleApply = async (id: string) => {
    setApplyingId(id);
    try {
      const result = presetSource === 'demo' ? await applyNewSpaceDemoById(id) : await applyNewSpaceBedStatusById(id);
      if (!result.ok) {
        addToast(result.error ? `应用失败：${result.error}` : '应用失败', 'error');
        return;
      }
      addToast(`已应用${presetSource === 'demo' ? ' demo ' : '姿态 '}${id}`, 'success');
      setLastAppliedId(id);
    } finally {
      setApplyingId(null);
    }
  };

  const cardTone = (id: string) => {
    if (id === 'zero') return 'border-emerald-700/70 bg-emerald-950/20 hover:border-emerald-500/80';
    return 'border-purple-800/60 bg-purple-950/20 hover:border-purple-500/80';
  };

  return (
    <motion.div
      key="positions"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPresetSource('current');
              void loadStatusList('current');
            }}
            disabled={loading}
            className={`inline-flex justify-center items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition disabled:opacity-60 ${presetSource === 'current' ? 'border border-indigo-700 bg-indigo-950/40 text-indigo-200 hover:border-indigo-500' : 'border border-gray-700 bg-gray-900/60 text-gray-300 hover:border-indigo-500/60'}`}
          >
            术士位
          </button>
          <button
            type="button"
            onClick={() => {
              setPresetSource('demo');
              void loadStatusList('demo');
            }}
            className={`inline-flex justify-center items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${presetSource === 'demo' ? 'border border-purple-700 bg-purple-950/40 text-purple-200 hover:border-purple-500' : 'border border-gray-700 bg-gray-900/60 text-gray-300 hover:border-purple-500/60'}`}
          >
            demo
          </button>
          <button
            type="button"
            onClick={() => void loadStatusList(presetSource)}
            disabled={loading}
            className="inline-flex justify-center items-center gap-1 rounded-lg border border-purple-700 bg-purple-950/40 px-2.5 py-1 text-[10px] font-bold text-purple-200 transition hover:border-purple-500 disabled:opacity-60"
          >
            刷新列表
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索姿态名称或ID"
            className="h-7 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-2 text-[10px] text-gray-200 outline-none focus:border-medical-teal"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="h-7 rounded-lg border border-gray-700 bg-gray-900 px-1.5 text-[9px] text-gray-300 hover:border-gray-500"
            >
              清空
            </button>
          )}
        </div>

        <div className="space-y-2">
          {filteredItems.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/40 px-3 py-5 text-center text-[11px] text-gray-500">
              暂无姿态数据
            </div>
          ) : (
            filteredItems.map(({ id, item }) => (
              <div key={id} className={`rounded-xl border p-3 transition ${cardTone(id)} ${lastAppliedId === id ? 'ring-1 ring-medical-teal/70' : ''}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-gray-100 truncate">{item.name}</div>
                    <div className="text-[10px] font-mono text-gray-400">ID: {id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleApply(id)}
                    disabled={applyingId !== null}
                    className="rounded-lg border border-medical-teal/40 bg-medical-teal/10 px-3 py-1 text-[11px] font-semibold text-medical-teal hover:border-medical-teal disabled:opacity-60 shrink-0"
                  >
                    {applyingId === id ? '应用中…' : '应用'}
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div>
                    {item.image && !brokenImageIds[id] && (
                      <div className={`overflow-hidden rounded-lg border border-gray-700 bg-black/20 h-40`}>
                        <img
                          src={item.image}
                          alt={`${item.name} 姿态图`}
                          className="w-full h-full object-contain bg-gray-950/70"
                          onError={() => {
                            setBrokenImageIds((prev) => ({ ...prev, [id]: true }));
                            addToast(`姿态图片加载失败：${item.name}（${id}） ${item.image ?? ''}`, 'warning');
                          }}
                        />
                      </div>
                    )}
                    {item.image && brokenImageIds[id] && (
                      <div className={`rounded-lg border border-dashed border-amber-700/60 bg-amber-950/20 px-3 py-3 text-[10px] text-amber-200/90 flex flex-col items-center justify-center text-center leading-relaxed gap-1 h-40`}>
                        <span>姿态图加载失败，请检查图片地址</span>
                        <span className="max-w-full truncate font-mono text-amber-300/80">{item.image}</span>
                      </div>
                    )}
                    {!item.image && (
                      <div className={`rounded-lg border border-dashed border-gray-700/70 bg-gray-900/40 px-3 py-3 text-[11px] text-gray-300 flex flex-col items-center justify-center text-center leading-relaxed gap-1 h-40`}>
                        <span className="font-medium text-gray-200">当前姿态暂无配图</span>
                        <span className="text-[10px] text-gray-400">可继续直接应用该姿态参数</span>
                      </div>
                    )}
                  </div>
                  <div className={`flex flex-col justify-center gap-1 leading-snug font-mono text-gray-200 text-[11px]`}>
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
    </motion.div>
  );
}
