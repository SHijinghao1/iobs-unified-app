// 日志数据页面：查询和展示日志曲线
import React, { useState, useEffect, useRef, lazy, Suspense, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, Calendar, Download, Database, LineChart, Table as TableIcon, Loader2, LayoutGrid } from 'lucide-react';
import { getLogInfo, getLog, LogDataPoint, LogField } from '../services/api';

const preloadLogChart = (() => {
  let promise: Promise<typeof import('../components/LogChart')> | null = null;
  return () => {
    if (!promise) {
      promise = import('../components/LogChart');
    }
    return promise;
  };
})();

const LogChart = lazy(() => preloadLogChart().then((m) => ({ default: m.LogChart })));
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { formatDisplayTime, formatApiDate, apiDateToInput, inputToApiDate } from '../utils/format';

function generateMockData(): { fields: LogField[]; data: LogDataPoint[] } {
  const mockFields: LogField[] = [
    { ID: 1, Name: '温度传感器1', Type: 'float', Unit: '°C', Port_Type: 'AI', Port_Index: 0, Data_Index: 0, Using: true, Order: 1, Remark: '主控室温度' },
    { ID: 2, Name: '压力传感器1', Type: 'float', Unit: 'MPa', Port_Type: 'AI', Port_Index: 0, Data_Index: 1, Using: true, Order: 2, Remark: '管道压力' },
    { ID: 3, Name: '流量传感器1', Type: 'float', Unit: 'm³/h', Port_Type: 'AI', Port_Index: 0, Data_Index: 2, Using: true, Order: 3, Remark: '水流量' },
    { ID: 4, Name: '液位传感器1', Type: 'float', Unit: 'm', Port_Type: 'AI', Port_Index: 0, Data_Index: 3, Using: true, Order: 4, Remark: '水箱液位' },
    { ID: 5, Name: '转速传感器1', Type: 'float', Unit: 'RPM', Port_Type: 'AI', Port_Index: 0, Data_Index: 4, Using: true, Order: 5, Remark: '电机转速' },
    { ID: 6, Name: '电压传感器1', Type: 'float', Unit: 'V', Port_Type: 'AI', Port_Index: 0, Data_Index: 5, Using: true, Order: 6, Remark: '主电源电压' },
    { ID: 7, Name: '电流传感器1', Type: 'float', Unit: 'A', Port_Type: 'AI', Port_Index: 0, Data_Index: 6, Using: true, Order: 7, Remark: '主回路电流' },
    { ID: 8, Name: '功率传感器1', Type: 'float', Unit: 'kW', Port_Type: 'AI', Port_Index: 0, Data_Index: 7, Using: true, Order: 8, Remark: '实时功率' },
    { ID: 9, Name: '湿度传感器1', Type: 'float', Unit: '%RH', Port_Type: 'AI', Port_Index: 0, Data_Index: 8, Using: true, Order: 9, Remark: '环境湿度' },
    { ID: 10, Name: '振动传感器1', Type: 'float', Unit: 'mm/s', Port_Type: 'AI', Port_Index: 0, Data_Index: 9, Using: true, Order: 10, Remark: '设备振动' },
  ];

  const now = new Date();
  const dataPoints: LogDataPoint[] = [];
  const pointCount = 120;

  for (let i = pointCount; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 5000);
    const timeStr = timestamp.toISOString().replace('T', ' ').substring(0, 19);

    mockFields.forEach((field) => {
      let value: number;
      const baseValue = (() => {
        switch (field.ID) {
          case 1: return 25.5;
          case 2: return 1.2;
          case 3: return 150.0;
          case 4: return 3.5;
          case 5: return 1450;
          case 6: return 380;
          case 7: return 25.5;
          case 8: return 9.8;
          case 9: return 65;
          case 10: return 2.5;
          default: return 50;
        }
      })();

      const amplitude = baseValue * 0.08;
      const noise = (Math.random() - 0.5) * amplitude * 0.3;
      const trend = Math.sin(i * 0.08 + field.ID * 0.5) * amplitude;
      value = baseValue + trend + noise;

      if (field.ID === 10 && Math.random() > 0.95) {
        value *= (1.5 + Math.random());
      }

      dataPoints.push({
        timestamp: timeStr,
        field_id: field.ID,
        value: parseFloat(value.toFixed(3)),
      });
    });
  }

  return { fields: mockFields, data: dataPoints };
}

export function LogData() {
  const { isDarkMode, settings, logFields: fields, setLogFields, setConnectionStatus } = useAppStore();
  const getQueryableFieldIds = useCallback((sourceFields: typeof fields) => {
    return sourceFields
      .filter(field => field.Using !== false)
      .filter(field => field.Type && String(field.Type).trim())
      .filter(field => field.Data_Index !== null && field.Data_Index !== undefined && String(field.Data_Index).trim() !== '')
      .map(field => field.ID)
      .join(',');
  }, []);
  const [data, setData] = useState<LogDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('chart');
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const [isSeparatedView, setIsSeparatedView] = useState(false);

  // Query state
  const [timeBegin, setTimeBegin] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [preset, setPreset] = useState<number>(10);
  const [searchField, setSearchField] = useState('');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const chartPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fieldById = useMemo(() => {
    const map = new Map<number, typeof fields[number]>();
    fields.forEach((field) => {
      map.set(Number(field.ID), field);
    });
    return map;
  }, [fields]);

  const normalizedSearch = useMemo(() => searchField.trim().toLowerCase(), [searchField]);

  const scheduleChartPrefetch = React.useCallback((delay = 150) => {
    if (chartPrefetchTimerRef.current) return;
    chartPrefetchTimerRef.current = setTimeout(() => {
      void preloadLogChart();
      chartPrefetchTimerRef.current = null;
    }, delay);
  }, []);

  const flushChartPrefetch = React.useCallback(() => {
    if (chartPrefetchTimerRef.current) {
      clearTimeout(chartPrefetchTimerRef.current);
      chartPrefetchTimerRef.current = null;
    }
    void preloadLogChart();
  }, []);

  // Keep refs for values needed inside callbacks without re-triggering effects
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    return () => {
      if (chartPrefetchTimerRef.current) {
        clearTimeout(chartPrefetchTimerRef.current);
        chartPrefetchTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'chart') {
      flushChartPrefetch();
    }
  }, [viewMode, flushChartPrefetch]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        if (useMockData) {
          const mock = generateMockData();
          setLogFields(mock.fields);

          const end = new Date();
          const start = new Date(end.getTime() - 10 * 60 * 1000);
          const tb = formatApiDate(start);
          const te = formatApiDate(end);
          setTimeBegin(tb);
          setTimeEnd(te);
          setPreset(10);

          setData(mock.data);
        } else {
          const res = await getLogInfo(settings.serverIp);
          setLogFields(res.Fields);

          const end = new Date();
          const start = new Date(end.getTime() - 10 * 60 * 1000);
          const tb = formatApiDate(start);
          const te = formatApiDate(end);
          setTimeBegin(tb);
          setTimeEnd(te);
          setPreset(10);

          const fieldIds = getQueryableFieldIds(res.Fields);
          const logRes = await getLog(settings.serverIp, tb, te, fieldIds);
          setData(logRes.data);
        }
      } catch (err) {
        console.error('Initial load failed', err);
        const message = err instanceof Error ? err.message : '未知错误';
        setError(`获取数据失败：${message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [settings.serverIp, setLogFields, useMockData]);

  const handleQuery = React.useCallback(async (tb?: string, te?: string) => {
    const queryTb = tb || timeBegin;
    const queryTe = te || timeEnd;

    if (!queryTb || !queryTe) return;
    setIsLoading(true);
    setError(null);
    try {
      const fieldIds = getQueryableFieldIds(fields);
      const res = await getLog(settings.serverIp, queryTb, queryTe, fieldIds);
      setData(res.data);
    } catch (err) {
      console.error('Query failed', err);
      const message = err instanceof Error ? err.message : '未知错误';
      setError(`获取日志数据失败：${message}`);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [timeBegin, timeEnd, fields, settings.serverIp]);

  const handlePresetChange = React.useCallback((minutes: number) => {
    setPreset(minutes);
    const end = new Date();
    const start = new Date(end.getTime() - minutes * 60 * 1000);
    const tb = formatApiDate(start);
    const te = formatApiDate(end);
    setTimeBegin(tb);
    setTimeEnd(te);
    handleQuery(tb, te);
  }, [handleQuery]);

  const handleReset = () => {
    setSearchField('');
    setData([]);
    setError(null);
    handlePresetChange(10);
  };

  const handleExportCSV = () => {
    const exportData = data.filter(point => {
      if (!normalizedSearch) return true;
      const field = fieldById.get(Number(point.field_id));
      return (
        field?.Name.toLowerCase().includes(normalizedSearch) ||
        String(point.field_id).includes(normalizedSearch)
      );
    });

    if (exportData.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }

    const headers = ['日志ID', '名称', '时间', '数值', '单位', '备注'];
    const rows = exportData.map(point => {
      const field = fieldById.get(Number(point.field_id));
      return [
        point.field_id,
        field?.Name || '未知字段',
        formatDisplayTime(point.timestamp),
        point.value,
        field?.Unit || '',
        field?.Remark || '-',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `日志导出_${formatApiDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('导出成功');
  };

  // Auto-refresh logic (1-second polling)
  useEffect(() => {
    if (!isAutoRefresh) return;

    setConnectionStatus('online');

    const poll = async () => {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - (presetRef.current || 10) * 60 * 1000);
        const tb = formatApiDate(start);
        const te = formatApiDate(end);
        const fieldIds = getQueryableFieldIds(fieldsRef.current);
        const res = await getLog(settings.serverIp, tb, te, fieldIds);
        setData(res.data);
        setTimeEnd(te);
      } catch (e) {
        console.warn('Live poll failed', e);
        setConnectionStatus('offline');
      }
    };

    poll();
    const timer = setInterval(poll, 1000);

    return () => {
      clearInterval(timer);
      setConnectionStatus('offline');
    };
  }, [isAutoRefresh, settings.serverIp, setConnectionStatus]);

  const filteredData = useMemo(() => {
    if (!normalizedSearch) return data;

    return data.filter(point => {
      const field = fieldById.get(Number(point.field_id));
      return (
        field?.Name.toLowerCase().includes(normalizedSearch) ||
        String(point.field_id).includes(normalizedSearch)
      );
    });
  }, [data, fieldById, normalizedSearch]);

  const rowVirtualizer = useVirtualizer({
    count: viewMode === 'table' ? filteredData.length : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full p-3 md:p-4 space-y-3 md:space-y-4 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>日志数据</h1>
          <p className={`mt-1 text-sm font-medium ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>实时监控与历史数据分析</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center p-1 rounded-xl border ${isDarkMode ? 'bg-[#1c1c1e]/80 border-white/10 backdrop-blur-xl' : 'bg-white/80 border-black/5 backdrop-blur-xl'}`}>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                viewMode === 'table'
                  ? (isDarkMode ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-[#f5f5f7] text-black shadow-sm')
                  : (isDarkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
              }`}
            >
              <TableIcon className="w-4 h-4 mr-2" />
              表格
            </button>
            <button
              onClick={() => {
                flushChartPrefetch();
                setViewMode('chart');
              }}
              onMouseEnter={() => scheduleChartPrefetch(120)}
              onFocus={() => scheduleChartPrefetch(80)}
              onTouchStart={() => scheduleChartPrefetch(0)}
              className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                viewMode === 'chart'
                  ? (isDarkMode ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-[#f5f5f7] text-black shadow-sm')
                  : (isDarkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
              }`}
            >
              <LineChart className="w-4 h-4 mr-2" />
              曲线
            </button>
          </div>
          <Button
            variant="outline"
            onClick={() => setUseMockData(!useMockData)}
            className={`h-10 rounded-lg transition-all duration-300 ${useMockData ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : (isDarkMode ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5')}`}
          >
            <Database className="w-4 h-4 mr-2" />
            {useMockData ? '模拟数据' : '真实数据'}
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className={`h-10 rounded-lg transition-all duration-300 ${isDarkMode ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5'}`}>
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </Button>
        </div>
      </div>

      {/* 查询部分 */}
      <div className={`p-3 md:p-4 rounded-[1.75rem] border shadow-sm transition-colors duration-500 space-y-3 relative overflow-hidden ${isDarkMode ? 'bg-[#1c1c1e]/60 border-white/10 backdrop-blur-3xl' : 'bg-white/60 border-black/5 backdrop-blur-3xl'}`}>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-end">
          <div className="space-y-2">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>开始时间</label>
            <div className={`relative flex items-center h-10 rounded-xl border transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-white/10 focus-within:border-[#007AFF]/50 focus-within:bg-black/40' : 'bg-black/[0.02] border-black/5 focus-within:border-[#007AFF]/50 focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(0,122,255,0.1)]'}`}>
              <Calendar className={`absolute left-4 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`} />
              <input
                type="datetime-local"
                step="1"
                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                value={apiDateToInput(timeBegin)}
                onChange={(e) => { setTimeBegin(inputToApiDate(e.target.value)); setPreset(0); }}
                className={`w-full h-full pl-10 pr-3 bg-transparent outline-none text-sm font-medium transition-colors ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'}`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>结束时间</label>
            <div className={`relative flex items-center h-10 rounded-xl border transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-white/10 focus-within:border-[#007AFF]/50 focus-within:bg-black/40' : 'bg-black/[0.02] border-black/5 focus-within:border-[#007AFF]/50 focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(0,122,255,0.1)]'}`}>
              <Calendar className={`absolute left-4 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`} />
              <input
                type="datetime-local"
                step="1"
                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                value={apiDateToInput(timeEnd)}
                onChange={(e) => { setTimeEnd(inputToApiDate(e.target.value)); setPreset(0); }}
                className={`w-full h-full pl-10 pr-3 bg-transparent outline-none text-sm font-medium transition-colors ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'}`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>日志字段搜索</label>
            <div className={`relative flex items-center h-10 rounded-xl border transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-white/10 focus-within:border-[#007AFF]/50 focus-within:bg-black/40' : 'bg-black/[0.02] border-black/5 focus-within:border-[#007AFF]/50 focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(0,122,255,0.1)]'}`}>
              <Search className={`absolute left-4 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`} />
              <input
                placeholder="搜索字段..."
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className={`w-full h-full pl-10 pr-3 bg-transparent outline-none text-sm font-medium transition-colors ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'}`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-3 pt-4 border-t transition-colors duration-500 border-black/5 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest mr-3 ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>快速选择</span>
            {[10, 30, 60, 120, 1440].map(mins => (
              <button
                key={mins}
                onClick={() => handlePresetChange(mins)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
                  preset === mins
                    ? 'bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]'
                    : (isDarkMode ? 'bg-white/5 text-white/70 hover:bg-white/10' : 'bg-black/5 text-black/70 hover:bg-black/10')
                }`}
              >
                {mins < 60 ? `${mins}分钟` : mins === 1440 ? '24小时' : `${mins / 60}小时`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
            <button
              onClick={() => setIsSeparatedView(!isSeparatedView)}
              className={`relative flex items-center px-4 h-10 text-xs font-semibold rounded-lg transition-all duration-300 border overflow-hidden ${
                isSeparatedView
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400 dark:border-blue-500/30'
                  : (isDarkMode ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5')
              }`}
            >
              {isSeparatedView && (
                <motion.div
                  className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <LayoutGrid className={`w-4 h-4 mr-2 ${isSeparatedView ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span className="relative">分离视图</span>
            </button>
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`relative flex items-center px-4 h-10 text-xs font-semibold rounded-lg transition-all duration-300 border overflow-hidden ${
                isAutoRefresh
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30'
                  : (isDarkMode ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5')
              }`}
            >
              {isAutoRefresh && (
                <motion.div
                  className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <div className={`relative w-2 h-2 rounded-full mr-2 ${isAutoRefresh ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-gray-400'}`} />
              <span className="relative">实时监控（1秒）</span>
            </button>
            <Button variant="outline" onClick={handleReset} className={`h-10 px-4 rounded-lg font-semibold transition-all duration-300 ${isDarkMode ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5'}`}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重置
            </Button>
            <Button onClick={() => handleQuery()} disabled={isLoading && !isAutoRefresh} className="h-10 px-5 rounded-lg font-semibold bg-[#007AFF] hover:bg-[#007AFF]/90 text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)] transition-all duration-300">
              <Search className="w-4 h-4 mr-2" />
              {isLoading && !isAutoRefresh ? '查询中...' : '查询数据'}
            </Button>
          </div>
        </div>
      </div> 


      {/* 内容显示部分 */}
      <div className={`flex-1 rounded-[2rem] border shadow-sm overflow-hidden flex flex-col transition-colors duration-500 relative ${isDarkMode ? 'bg-[#1c1c1e]/60 border-white/10 backdrop-blur-3xl' : 'bg-white/60 border-black/5 backdrop-blur-3xl'}`}>

        <AnimatePresence>
          {isLoading && !isAutoRefresh && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${isDarkMode ? 'bg-black/40' : 'bg-white/40'}`}
            >
              <div className={`flex flex-col items-center p-6 rounded-2xl shadow-xl ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-white'}`}>
                <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin mb-4" />
                <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>正在加载数据...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex-1 relative min-h-0 ${viewMode === 'chart' ? 'overflow-hidden' : 'overflow-auto'}`}>
          <AnimatePresence mode="wait">
            {viewMode === 'table' ? (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <div ref={tableContainerRef} className="overflow-x-auto h-full">
                  <Table className="min-w-max table-fixed relative">
                    <TableHeader className={`sticky top-0 z-10 backdrop-blur-2xl ${isDarkMode ? 'bg-[#1c1c1e]/90' : 'bg-white/90'}`}>
                      <TableRow className="border-none">
                        <TableHead className={`w-[100px] text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>日志ID</TableHead>
                        <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>名称</TableHead>
                        <TableHead className={`w-[200px] text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>时间</TableHead>
                        <TableHead className={`text-right text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>数值</TableHead>
                        <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>备注</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rowVirtualizer.getVirtualItems().length > 0 && (
                        <TableRow style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} className="border-none hover:bg-transparent" />
                      )}
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const point = filteredData[virtualRow.index];
                        const field = fieldById.get(Number(point.field_id));
                        return (
                          <TableRow
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            className={`transition-colors duration-200 ${virtualRow.index % 2 === 0 ? (isDarkMode ? 'bg-white/[0.02]' : 'bg-black/[0.02]') : ''} ${isDarkMode ? 'border-white/5 hover:bg-white/10' : 'border-black/5 hover:bg-black/[0.05]'}`}
                          >
                            <TableCell className="font-mono text-xs opacity-70">{point.field_id}</TableCell>
                            <TableCell className="font-semibold">{field?.Name || '未知字段'}</TableCell>
                            <TableCell className="font-mono text-xs opacity-60">{formatDisplayTime(point.timestamp)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-[#007AFF]">
                              {point.value} <span className="text-[10px] opacity-60 ml-1 font-sans">{field?.Unit}</span>
                            </TableCell>
                            <TableCell className="text-xs font-medium opacity-60">{field?.Remark || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                      {rowVirtualizer.getVirtualItems().length > 0 && (
                        <TableRow
                          style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}
                          className="border-none hover:bg-transparent"
                        />
                      )}
                      {filteredData.length === 0 && !isLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-col items-center justify-center opacity-50"
                            >
                              <div className={`p-4 rounded-full mb-4 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                                <Database className="w-8 h-8" />
                              </div>
                              <p className="font-medium">
                                {error ? <span className="text-red-500">{error}</span> : '暂无数据，请调整查询条件'}
                              </p>
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="chart"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col"
              >
                {filteredData.length > 0 ? (
                  <Suspense
                    fallback={
                      <div className="h-full flex items-center justify-center opacity-60">
                        <Loader2 className="w-6 h-6 text-[#007AFF] animate-spin" />
                      </div>
                    }
                  >
                    <LogChart data={filteredData} fields={fields} isDarkMode={isDarkMode} thresholds={settings.thresholds} isSeparatedView={isSeparatedView} onSeparatedViewChange={setIsSeparatedView} />
                  </Suspense>
                ) : !isLoading ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50"
                  >
                    <div className={`p-4 rounded-full mb-4 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                      <LineChart className="w-8 h-8" />
                    </div>
                    <p className="font-medium">暂无数据，请调整查询条件</p>
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`p-4 border-t text-xs flex justify-between items-center transition-colors duration-500 ${isDarkMode ? 'border-white/10 text-white/50 bg-[#1c1c1e]/40' : 'border-black/5 text-black/50 bg-white/40'}`}>
          <span className="font-medium">显示 {filteredData.length} 条记录</span>
          <span className="font-medium">{viewMode === 'table' ? '数据已按时间倒序排列' : '数据已按时间正序排列'}</span>
        </div>
      </div>
    </div>
  );
}
