// 日志曲线图表组件，基于 recharts
import React, { useMemo, useState, useEffect, useRef } from "react";
import { LogDataPoint, LogField } from "../services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from "recharts";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Minus,
  Settings2,
  ActivitySquare,
  Palette,
  MoveVertical,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface LogChartProps {
  data: LogDataPoint[];
  fields: LogField[];
  isDarkMode?: boolean;
  thresholds?: Record<number, { warning: number; critical: number }>;
  isSeparatedView?: boolean;
  onSeparatedViewChange?: (value: boolean) => void;
}

const DEFAULT_COLORS = [
  "#007AFF",
  "#34C759",
  "#FF9500",
  "#AF52DE",
  "#FF2D55",
  "#5AC8FA",
  "#FF3B30",
  "#5856D6",
];

import { formatChartTimestamp as formatTimestamp } from '../utils/format';

function TransformControl({
  transform,
  onUpdate,
  isDarkMode,
}: {
  transform: { scale: number; offset: number };
  onUpdate: (key: "scale" | "offset", value: number) => void;
  isDarkMode?: boolean;
}) {
  const [scale, setScale] = useState(transform?.scale ?? 1);
  const [offset, setOffset] = useState(transform?.offset ?? 0);

  useEffect(() => {
    setScale(transform?.scale ?? 1);
    setOffset(transform?.offset ?? 0);
  }, [transform]);

  const handleScaleChange = (v: number[]) => {
    const val = v[0];
    if (typeof val === "number" && !isNaN(val)) {
      setScale(val);
      onUpdate("scale", val);
    }
  };

  const handleOffsetChange = (v: number[]) => {
    const val = v[0];
    if (typeof val === "number" && !isNaN(val)) {
      setOffset(val);
      onUpdate("offset", val);
    }
  };

  return (
    <PopoverContent
      className={`w-64 p-5 border rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl !z-[9999] pointer-events-auto ${isDarkMode ? "bg-slate-900/90 border-white/10" : "bg-white/90 border-black/5"}`}
      align="start"
      side="right"
      sideOffset={12}
      avoidCollisions={true}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label
              className={`text-xs font-semibold flex items-center gap-1.5 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
            >
              <Maximize2
                className={`w-3.5 h-3.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
              />{" "}
              高度放缩
            </Label>
            <span
              className={`text-xs font-mono px-1.5 py-0.5 rounded-md ${isDarkMode ? "text-slate-400 bg-slate-800" : "text-slate-500 bg-slate-100"}`}
            >
              {Number(scale).toFixed(1)}x
            </span>
          </div>
          <Slider
            value={[scale]}
            min={0.1}
            max={5}
            step={0.1}
            onValueChange={handleScaleChange}
            className={`[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:mt-0 [&_[data-slot=slider-range]]:bg-blue-500 ${isDarkMode ? "[&_[data-slot=slider-track]]:bg-slate-700 [&_[data-slot=slider-thumb]]:border-white/30 [&_[data-slot=slider-thumb]]:bg-slate-800" : "[&_[data-slot=slider-track]]:bg-slate-200 [&_[data-slot=slider-thumb]]:border-black/20 [&_[data-slot=slider-thumb]]:bg-white"}`}
          />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label
              className={`text-xs font-semibold flex items-center gap-1.5 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
            >
              <MoveVertical
                className={`w-3.5 h-3.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
              />{" "}
              纵向拖动
            </Label>
            <span
              className={`text-xs font-mono px-1.5 py-0.5 rounded-md ${isDarkMode ? "text-slate-400 bg-slate-800" : "text-slate-500 bg-slate-100"}`}
            >
              {Number(offset) > 0 ? "+" : ""}
              {Number(offset)}
            </span>
          </div>
          <Slider
            value={[offset]}
            min={-100}
            max={100}
            step={1}
            onValueChange={handleOffsetChange}
            className={`[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:mt-0 [&_[data-slot=slider-range]]:bg-blue-500 ${isDarkMode ? "[&_[data-slot=slider-track]]:bg-slate-700 [&_[data-slot=slider-thumb]]:border-white/30 [&_[data-slot=slider-thumb]]:bg-slate-800" : "[&_[data-slot=slider-track]]:bg-slate-200 [&_[data-slot=slider-thumb]]:border-black/20 [&_[data-slot=slider-thumb]]:bg-white"}`}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`w-full h-9 text-xs font-medium border rounded-xl shadow-sm active:scale-95 transition-all duration-300 ${isDarkMode ? "border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white" : "border-black/10 text-slate-700 hover:bg-slate-50"}`}
          onClick={() => {
            onUpdate("scale", 1);
            onUpdate("offset", 0);
          }}
        >
          重置参数
        </Button>
      </div>
    </PopoverContent>
  );
}

export const LogChart: React.FC<LogChartProps> = ({
  data,
  fields,
  isDarkMode = false,
  thresholds = {},
  isSeparatedView: externalSeparatedView = false,
  onSeparatedViewChange,
}) => {
  const [differentiatedFields, setDifferentiatedFields] = useState<Set<number>>(
    new Set(),
  );
  const [hiddenFields, setHiddenFields] = useState<Set<number>>(new Set());
  const [fieldColors, setFieldColors] = useState<Record<number, string>>({});
  const [fieldTransforms, setFieldTransforms] = useState<
    Record<number, { scale: number; offset: number }>
  >({});
  const [isSeparatedView, setIsSeparatedView] = useState(externalSeparatedView);
  const [showAllFieldControls, setShowAllFieldControls] = useState(false);
  const [showAllLiveCards, setShowAllLiveCards] = useState(false);
  const [isInteractiveReady, setIsInteractiveReady] = useState(false);
  const [expandedSettingsFieldId, setExpandedSettingsFieldId] = useState<number | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (externalSeparatedView !== isSeparatedView) {
      setIsSeparatedView(externalSeparatedView);
    }
  }, [externalSeparatedView]);

  useEffect(() => {
    const initialColors: Record<number, string> = {};
    const initialTransforms: Record<number, { scale: number; offset: number }> =
      {};
    fields.forEach((f, i) => {
      initialColors[f.ID] = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      initialTransforms[f.ID] = { scale: 1, offset: 0 };
    });
    setFieldColors(initialColors);
    setFieldTransforms(initialTransforms);
    setShowAllFieldControls(false);
    setShowAllLiveCards(false);
  }, [fields]);

  useEffect(() => {
    const styleId = 'iobs-custom-scrollbar-styles';

    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* IOBS白蓝色滚动条 - 动态注入 */
        *::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
        *::-webkit-scrollbar-track { background: rgba(245, 250, 255, 0.6) !important; border-radius: 3px !important; }
        *::-webkit-scrollbar-thumb { background: rgba(160, 200, 235, 0.65) !important; border-radius: 3px !important; border: 1px solid rgba(180, 210, 240, 0.5) !important; box-shadow: 0 0 4px rgba(160, 200, 235, 0.2) !important; }
        *::-webkit-scrollbar-thumb:hover { background: rgba(140, 185, 225, 0.85) !important; box-shadow: 0 0 8px rgba(140, 185, 225, 0.35) !important; border-color: rgba(160, 200, 235, 0.7) !important; }
        *::-webkit-scrollbar-corner { background: transparent !important; }

        /* Firefox支持 */
        * { scrollbar-width: thin !important; scrollbar-color: rgba(160, 200, 235, 0.65) rgba(245, 250, 255, 0.6) !important; }

        /* 强制Popover最高层级 */
        [data-slot="popover-content"] {
          z-index: 99999 !important;
          position: fixed !important;
        }

        [data-slot="popover-positioner"] {
          z-index: 99999 !important;
        }

        /* 确保Slider可见 */
        [data-slot="slider-track"] {
          height: 6px !important;
          background: #e2e8f0 !important;
          opacity: 1 !important;
        }

        .dark [data-slot="slider-track"] {
          background: #334155 !important;
        }

        [data-slot="slider-range"] {
          opacity: 1 !important;
        }

        [data-slot="slider-thumb"] {
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        [data-slot="slider-control"] {
          position: relative !important;
          z-index: 10 !important;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle && document.head.contains(existingStyle)) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  useEffect(() => {
    setIsInteractiveReady(false);
    const rafId = requestAnimationFrame(() => {
      readyTimerRef.current = setTimeout(() => {
        setIsInteractiveReady(true);
        readyTimerRef.current = null;
      }, 180);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (readyTimerRef.current) {
        clearTimeout(readyTimerRef.current);
        readyTimerRef.current = null;
      }
    };
  }, [data, fields]);

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const map = new Map<string, Record<string, any>>();

    data.forEach((point) => {
      if (!map.has(point.timestamp)) {
        map.set(point.timestamp, { timestamp: point.timestamp });
      }
      const val = Number(point.value);
      map.get(point.timestamp)![`field_${point.field_id}`] = isNaN(val)
        ? null
        : val;
    });

    const sortedData = Array.from(map.values()).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );

    // 1. 首先应用微分计算 (Apply differentiation first)
    if (differentiatedFields.size > 0 && sortedData.length > 1) {
      for (let i = sortedData.length - 1; i > 0; i--) {
        const current = sortedData[i];
        const prev = sortedData[i - 1];

        fields.forEach((field) => {
          const key = `field_${field.ID}`;
          if (differentiatedFields.has(field.ID)) {
            if (
              current[key] !== undefined &&
              current[key] !== null &&
              prev[key] !== undefined &&
              prev[key] !== null
            ) {
              current[key] = Number((current[key] - prev[key]).toFixed(4));
            } else {
              current[key] = null;
            }
          }
        });
      }
      fields.forEach((field) => {
        if (differentiatedFields.has(field.ID)) {
          sortedData[0][`field_${field.ID}`] = 0;
        }
      });
    }

    return sortedData;
  }, [data, fields, differentiatedFields]);

  const transformedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    return chartData.map(point => {
      const transformedPoint = { ...point };
      fields.forEach((field) => {
        const key = `field_${field.ID}`;
        const originalKey = `field_${field.ID}_original`;
        
        if (transformedPoint[key] !== undefined && transformedPoint[key] !== null) {
          const transform = fieldTransforms[field.ID] || { scale: 1, offset: 0 };
          
          transformedPoint[originalKey] = transformedPoint[key];
          
          if (transform.scale !== 1 || transform.offset !== 0) {
            transformedPoint[key] = Number(
              (transformedPoint[key] * transform.scale + transform.offset).toFixed(4)
            );
          }
        }
      });
      return transformedPoint;
    });
  }, [chartData, fields, fieldTransforms]);

  const toggleDifferentiation = (fieldId: number) => {
    setDifferentiatedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const toggleFieldVisibility = (fieldId: number) => {
    setHiddenFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const updateColor = (fieldId: number, color: string) => {
    setFieldColors((prev) => ({ ...prev, [fieldId]: color }));
  };

  const updateTransform = (
    fieldId: number,
    key: "scale" | "offset",
    value: number,
  ) => {
    setFieldTransforms((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || { scale: 1, offset: 0 }),
        [key]: value,
      },
    }));
  };

  const latestData = chartData[chartData.length - 1] || {};
  const visibleFields = fields.filter((field) => !hiddenFields.has(field.ID));
  const LIVE_CARDS_COLLAPSED_COUNT = 4;
  const liveCardFields = showAllLiveCards
    ? visibleFields
    : visibleFields.slice(0, LIVE_CARDS_COLLAPSED_COUNT);
  const hiddenLiveCardCount = Math.max(0, visibleFields.length - liveCardFields.length);
  const FIELD_CONTROLS_COLLAPSED_COUNT = 5;
  const fieldControlItems = showAllFieldControls
    ? fields
    : fields.slice(0, FIELD_CONTROLS_COLLAPSED_COUNT);
  const hiddenControlCount = Math.max(0, fields.length - fieldControlItems.length);

  if (data.length === 0 || visibleFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-transparent">
        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-sm mb-4 ${isDarkMode ? "bg-slate-800 border-white/5" : "bg-white border-black/5"}`}
        >
          <ActivitySquare
            className={`w-8 h-8 ${isDarkMode ? "text-slate-500" : "text-slate-300"}`}
          />
        </div>
        <p
          className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
        >
          {data.length === 0 ? "暂无数据" : "当前已隐藏全部曲线"}
        </p>
        <p
          className={`text-xs mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
        >
          {data.length === 0 ? "请在左侧调整查询条件后重试" : "请在上方打开至少一条曲线"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 rounded-tl-2xl shadow-[-4px_-4px_24px_rgba(0,0,0,0.02)] border-t border-l ${isDarkMode ? "bg-slate-900 border-white/5" : "bg-white border-black/5"}`}
    >
      {/* 实时大数字面板 (Live Big Numbers Panel) - 精简版 */}
      <div className={`px-3 py-1.5 shrink-0 flex gap-1.5 overflow-x-auto overflow-y-visible custom-scrollbar relative ${isDarkMode ? "bg-slate-900/50 text-white" : "bg-slate-50 text-slate-900"}`}>
        {liveCardFields.map((field) => {
          const val = latestData[`field_${field.ID}`];
          const threshold = thresholds[field.ID];
          const isAnomaly = threshold ? val > threshold.warning : false;
          return (
            <div
              key={field.ID}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border shrink-0 transition-all ${isAnomaly ? "bg-rose-500/10 border-rose-500/30" : isDarkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-black/5 border-black/10 hover:bg-black/[0.08]"}`}
            >
              <span className={`text-[10px] font-medium text-slate-400 shrink-0 max-w-[70px] truncate`} title={field.Name}>{field.Name}</span>
              {isAnomaly && (
                <span className="text-rose-400 text-[8px] px-1 py-0.5 rounded bg-rose-500/20 animate-pulse shrink-0">!</span>
              )}
              <span className={`text-sm font-bold font-mono tabular-nums ${isAnomaly ? "text-rose-400" : isDarkMode ? "text-white" : "text-slate-900"}`}>
                {val !== undefined ? Number(val).toFixed(1) : "--"}
              </span>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">{field.Unit}</span>
            </div>
          );
        })}
        {visibleFields.length > LIVE_CARDS_COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setShowAllLiveCards((v) => !v)}
            title={showAllLiveCards ? "收起" : `展开全部 (${visibleFields.length} 个字段)`}
            className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 transition-colors ${isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"}`}
          >
            {showAllLiveCards ? (
              <>
                <ChevronUp className="w-3 h-3" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                +{hiddenLiveCardCount}
              </>
            )}
          </button>
        )}
      </div>

      {/* 图表控制区 (Chart Controls) - 精简版 */}
      {isInteractiveReady ? (
      <div
        className={`backdrop-blur-xl border-b px-3 py-1.5 shrink-0 z-10 ${isDarkMode ? "bg-slate-900/80 border-white/5" : "bg-white/80 border-black/5"}`}
      >
        <div className="flex flex-col gap-2">
          {/* 字段（曲线）控制 (Field Controls) - 紧凑版 */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <div
                className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
              >
                <Settings2 className="w-3.5 h-3.5 text-blue-500" />
                曲线控制
              </div>
              {fields.length > FIELD_CONTROLS_COLLAPSED_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAllFieldControls((v) => !v)}
                  title={showAllFieldControls ? "收起" : `展开全部 (${fields.length} 个字段)`}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 transition-colors ${isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {showAllFieldControls ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      收起
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      +{hiddenControlCount}
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 pr-1 custom-scrollbar">
              {fieldControlItems.map((field) => {
                const isHidden = hiddenFields.has(field.ID);
                const isDiff = differentiatedFields.has(field.ID);
                return (
                  <div
                    key={field.ID}
                    className={`flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-lg border shadow-sm hover:shadow-md transition-all group shrink-0 whitespace-nowrap ${isHidden ? "opacity-40" : ""} ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border-white/10" : "bg-slate-50/60 hover:bg-white border-black/5"}`}
                  >
                      {/* 颜色指示器 + 名称（点击切换显示） */}
                      <button
                        onClick={() => toggleFieldVisibility(field.ID)}
                        title={`点击${isHidden ? '显示' : '隐藏'} ${field.Name}`}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full shadow-sm border ${isDarkMode ? "border-white/20" : "border-black/10"} ${isHidden ? "grayscale opacity-50" : ""}`}
                          style={{ backgroundColor: fieldColors[field.ID] }}
                        />
                        <span
                          className={`text-[11px] font-medium cursor-pointer truncate max-w-[80px] transition-colors ${
                            isHidden
                              ? (isDarkMode ? "text-slate-600" : "text-slate-400")
                              : (isDarkMode ? "text-slate-300" : "text-slate-700")
                          }`}
                          title={`${field.Name} (点击${isHidden ? '显示' : '隐藏'})`}
                        >
                          {field.Name}
                        </span>
                      </button>

                      {/* 分隔线 */}
                      <div
                        className={`h-3 w-px ${isDarkMode ? "bg-white/10" : "bg-black/5"}`}
                      />

                      {/* 微分开关 */}
                      <button
                        onClick={() => !isHidden && toggleDifferentiation(field.ID)}
                        disabled={isHidden}
                        title={`微分: ${isDiff ? '开' : '关'}`}
                        className={`p-0.5 rounded transition-all ${isHidden ? "cursor-not-allowed opacity-30" : "hover:bg-black/5 dark:hover:bg-white/10"} ${isDiff ? "text-blue-500" : (isDarkMode ? "text-slate-600" : "text-slate-400")}`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                        </svg>
                      </button>

                      {/* 设置按钮（颜色 + 缩放） - 使用独立Popover */}
                      <Popover>
                        <PopoverTrigger asChild>
                        <button
                          className={`p-0.5 rounded transition-colors ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                          title="颜色 / 缩放设置"
                        >
                          <Settings2 className={`w-3.5 h-3.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                        </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="bottom"
                          align="start"
                          sideOffset={8}
                          className={`w-72 p-3 shadow-xl ${isDarkMode ? "bg-slate-800 border-white/10" : "bg-white border-slate-200"}`}
                        >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                          <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                            {field.Name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                            设置
                          </span>
                        </div>

                        <div className="space-y-2">
                          <Label className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            曲线颜色
                          </Label>
                          <div className="flex flex-wrap gap-1.5">
                            {DEFAULT_COLORS.map((c) => (
                              <button
                                key={c}
                                className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all hover:scale-110 active:scale-95 ${fieldColors[field.ID] === c ? (isDarkMode ? "border-white shadow-lg scale-110" : "border-slate-900 shadow-lg scale-110") : (isDarkMode ? "border-transparent opacity-50 hover:opacity-80" : "border-transparent opacity-50 hover:opacity-80")}`}
                                style={{ backgroundColor: c }}
                                onClick={() => updateColor(field.ID, c)}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label className={`text-[10px] font-semibold flex items-center gap-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                              ↗ 高度放大
                            </Label>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold min-w-[40px] text-center ${isDarkMode ? "bg-slate-700 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                              {(fieldTransforms[field.ID]?.scale ?? 1).toFixed(1)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={fieldTransforms[field.ID]?.scale ?? 1}
                            onChange={(e) => updateTransform(field.ID, 'scale', parseFloat(e.target.value))}
                            className={`w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none ${isDarkMode ? "bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-700" : "bg-slate-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-200"}`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label className={`text-[10px] font-semibold flex items-center gap-1 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                              ↕ 纵向拖动
                            </Label>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold min-w-[35px] text-center ${isDarkMode ? "bg-slate-700 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                              {(fieldTransforms[field.ID]?.offset ?? 0) > 0 ? '+' : ''}{fieldTransforms[field.ID]?.offset ?? 0}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            step="1"
                            value={fieldTransforms[field.ID]?.offset ?? 0}
                            onChange={(e) => updateTransform(field.ID, 'offset', parseInt(e.target.value))}
                            className={`w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none ${isDarkMode ? "bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-700" : "bg-slate-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-200"}`}
                          />
                        </div>

                        <button
                          onClick={() => {
                            updateTransform(field.ID, 'scale', 1);
                            updateTransform(field.ID, 'offset', 0);
                          }}
                          className={`w-full py-1.5 text-[11px] font-medium rounded-md border transition-all ${isDarkMode ? "border-white/10 text-slate-300 hover:bg-slate-700 active:scale-[0.98]" : "border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-[0.98]"}`}
                        >
                          重置参数
                        </button>
                      </div>
                      </PopoverContent>
                      </Popover>
                    </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      ) : (
      <div
        className={`border-b px-4 py-2 shrink-0 z-10 ${isDarkMode ? "bg-slate-900/70 border-white/5" : "bg-white/70 border-black/5"}`}
      >
        <div className="flex items-center justify-between">
          <div className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            图表控件加载中...
          </div>
          <div className="flex items-center gap-2 opacity-70">
            <div className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-slate-500" : "bg-slate-400"}`} />
            <div className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-slate-500" : "bg-slate-400"}`} />
            <div className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-slate-500" : "bg-slate-400"}`} />
          </div>
        </div>
      </div>
      )}

      {/* 图表渲染区 (Chart Area) */}
      <div
        className={`flex-1 w-full p-2 md:p-3 relative min-h-0 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}
      >
        <div
          className={`absolute inset-2 md:inset-3 ${isSeparatedView ? "overflow-y-auto flex flex-col gap-4 pr-2 custom-scrollbar" : ""}`}
        >
          {!isSeparatedView ? (
              <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={transformedChartData}
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                syncId="logChartSync"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDarkMode ? "#ffffff" : "#000000"}
                  strokeOpacity={isDarkMode ? 0.05 : 0.04}
                />
                <XAxis
                  dataKey="timestamp"
                  tick={{
                    fontSize: 11,
                    fill: isDarkMode ? "#94a3b8" : "#64748b",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  tickLine={false}
                  axisLine={{
                    stroke: isDarkMode ? "#ffffff" : "#000000",
                    strokeOpacity: 0.1,
                  }}
                  minTickGap={60}
                  tickFormatter={formatTimestamp}
                />

                <YAxis
                  yAxisId="left"
                  tick={{
                    fontSize: 11,
                    fill: isDarkMode ? "#94a3b8" : "#64748b",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (typeof val !== "number") return val;
                    const firstField = visibleFields[0];
                    if (!firstField) return val.toFixed(1);
                    const transform = fieldTransforms[firstField.ID] || { scale: 1, offset: 0 };
                    const originalVal = (val - transform.offset) / transform.scale;
                    return originalVal.toFixed(1);
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode
                      ? "rgba(15, 23, 42, 0.85)"
                      : "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "16px",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                    border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
                    fontFamily: "Inter, sans-serif",
                    padding: "12px 16px",
                  }}
                  labelStyle={{
                    fontWeight: "600",
                    color: isDarkMode ? "#f8fafc" : "#0f172a",
                    marginBottom: "8px",
                  }}
                  itemStyle={{
                    fontSize: "12px",
                    padding: "3px 0",
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 500,
                  }}
                  labelFormatter={formatTimestamp}
                  formatter={(value, name, item, index, payload) => {
                    if (typeof value !== "number") return value;
                    
                    const fieldIdMatch = name?.toString().match(/field_(\d+)/);
                    if (!fieldIdMatch) return value.toFixed(2);
                    
                    const fieldId = parseInt(fieldIdMatch[1]);
                    const originalKey = `field_${fieldId}_original`;
                    const originalValue = item.payload?.[originalKey];
                    
                    if (originalValue !== undefined && originalValue !== null) {
                      return originalValue.toFixed(2);
                    }
                    
                    return value.toFixed(2);
                  }}
                />

                {visibleFields.map((field, index) => (
                  <Line
                    key={field.ID}
                    yAxisId="left"
                    type="monotone"
                    dataKey={`field_${field.ID}`}
                    name={`${field.Name} ${differentiatedFields.has(field.ID) ? "(微分)" : ""} ${fieldTransforms[field.ID]?.scale !== 1 || fieldTransforms[field.ID]?.offset !== 0 ? "(已缩放/偏移)" : ""} (${field.Unit})`}
                    stroke={
                      fieldColors[field.ID] ||
                      DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                    }
                    strokeWidth={3.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                ))}

                {/* 安全区域 / 告警阈值线 (Safe Zone / Thresholds) */}
                {visibleFields.map((f) => {
                  const threshold = thresholds[f.ID];
                  if (!threshold) return null;
                  return (
                    <React.Fragment key={`ref-${f.ID}`}>
                      <ReferenceLine
                        yAxisId="left"
                        y={threshold.warning}
                        stroke="#FF9500"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                        label={{
                          position: "insideTopLeft",
                          value: `${f.Name} 警告线 (${threshold.warning})`,
                          fill: "#FF9500",
                          fontSize: 10,
                        }}
                      />
                      <ReferenceLine
                        yAxisId="left"
                        y={threshold.critical}
                        stroke="#FF3B30"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                        label={{
                          position: "insideTopLeft",
                          value: `${f.Name} 危险线 (${threshold.critical})`,
                          fill: "#FF3B30",
                          fontSize: 10,
                        }}
                      />
                    </React.Fragment>
                  );
                })}

                <Brush
                  dataKey="timestamp"
                  height={24}
                  stroke="#94a3b8"
                  fill="#f8fafc"
                  tickFormatter={() => ""}
                  className="mt-4"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            visibleFields.map((field, index) => (
              <div
                key={field.ID}
                className="h-[250px] w-full shrink-0 flex flex-col"
              >
                <div
                  className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-t-lg border-b shrink-0 ${isDarkMode ? "bg-slate-800/80 text-slate-300 border-white/10" : "bg-white/80 text-slate-700 border-black/5"}`}
                >
                  {field.Name} ({field.Unit})
                </div>
                <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={transformedChartData}
                    margin={{
                      top: 8,
                      right: 0,
                      left: 0,
                      bottom: index === fields.length - 1 ? 0 : 20,
                    }}
                    syncId="logChartSync"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={isDarkMode ? "#ffffff" : "#000000"}
                      strokeOpacity={isDarkMode ? 0.05 : 0.04}
                    />
                    <XAxis
                      dataKey="timestamp"
                      tick={{
                        fontSize: 11,
                        fill: isDarkMode ? "#94a3b8" : "#64748b",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                      tickLine={false}
                      axisLine={{
                        stroke: isDarkMode ? "#ffffff" : "#000000",
                        strokeOpacity: 0.1,
                      }}
                      minTickGap={60}
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{
                        fontSize: 11,
                        fill: isDarkMode ? "#94a3b8" : "#64748b",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        const transform = fieldTransforms[field.ID] || { scale: 1, offset: 0 };
                        const originalVal = (val - transform.offset) / transform.scale;
                        return originalVal.toFixed(1);
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode
                          ? "rgba(15, 23, 42, 0.85)"
                          : "rgba(255, 255, 255, 0.85)",
                        backdropFilter: "blur(12px)",
                        borderRadius: "16px",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                        border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
                        fontFamily: "Inter, sans-serif",
                        padding: "12px 16px",
                      }}
                      labelStyle={{
                        fontWeight: "600",
                        color: isDarkMode ? "#f8fafc" : "#0f172a",
                        marginBottom: "8px",
                      }}
                      itemStyle={{
                        fontSize: "12px",
                        padding: "3px 0",
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 500,
                      }}
                      labelFormatter={formatTimestamp}
                      formatter={(value, name, item, index, payload) => {
                        if (typeof value !== "number") return value;
                        
                        const originalKey = `field_${field.ID}_original`;
                        const originalValue = item.payload?.[originalKey];
                        
                        if (originalValue !== undefined && originalValue !== null) {
                          return originalValue.toFixed(2);
                        }
                        
                        return value.toFixed(2);
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={`field_${field.ID}`}
                      name={`${field.Name} ${differentiatedFields.has(field.ID) ? "(微分)" : ""} ${fieldTransforms[field.ID]?.scale !== 1 || fieldTransforms[field.ID]?.offset !== 0 ? "(已缩放/偏移)" : ""} (${field.Unit})`}
                      stroke={
                        fieldColors[field.ID] ||
                        DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                      }
                      strokeWidth={3.5}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls={true}
                      isAnimationActive={false}
                    />
                    {/* 安全区域 / 告警阈值线 (Safe Zone / Thresholds) */}
                    {thresholds[field.ID] && (
                      <React.Fragment>
                        <ReferenceLine
                          yAxisId="left"
                          y={thresholds[field.ID].warning}
                          stroke="#FF9500"
                          strokeDasharray="3 3"
                          strokeOpacity={0.5}
                          label={{
                            position: "insideTopLeft",
                            value: `${field.Name} 警告线 (${thresholds[field.ID].warning})`,
                            fill: "#FF9500",
                            fontSize: 10,
                          }}
                        />
                        <ReferenceLine
                          yAxisId="left"
                          y={thresholds[field.ID].critical}
                          stroke="#FF3B30"
                          strokeDasharray="3 3"
                          strokeOpacity={0.5}
                          label={{
                            position: "insideTopLeft",
                            value: `${field.Name} 危险线 (${thresholds[field.ID].critical})`,
                            fill: "#FF3B30",
                            fontSize: 10,
                          }}
                        />
                      </React.Fragment>
                    )}
                    {/* 显示时间轴缩放刷 (Show brush on last chart for sync) */}
                    {index === visibleFields.length - 1 && (
                      <Brush
                        dataKey="timestamp"
                        height={24}
                        stroke="#94a3b8"
                        fill="#f8fafc"
                        tickFormatter={() => ""}
                        className="mt-4"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
