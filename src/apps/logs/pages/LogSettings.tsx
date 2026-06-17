// 日志配置页面：管理日志字段和阈值
import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Search, RefreshCw, Loader2 } from 'lucide-react';
import { getLogInfo, LogField } from '../services/api';

interface LogConfig extends LogField {
  Address: string;
  Order: number;
  Enabled: boolean;
  Remark: string;
}

export function LogSettings() {
  const { isDarkMode, settings, setLogFields } = useAppStore();
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<LogConfig[]>([]);
  const [searchId, setSearchId] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchRemark, setSearchRemark] = useState('');
  
  const { data: logInfo, isLoading } = useQuery({
    queryKey: ['logInfo', settings.serverIp],
    queryFn: () => getLogInfo(settings.serverIp),
  });

  useEffect(() => {
    if (logInfo?.Fields) {
      const mappedLogs: LogConfig[] = logInfo.Fields.map((f, index) => ({
        ...f,
        Name: f.Name ?? '',
        Unit: f.Unit ?? '',
        Type: f.Type ?? 'string',
        Port_Type: f.Port_Type ?? 'TCP',
        Port_Index: f.Port_Index ?? '',
        Data_Index: f.Data_Index ?? '',
        Address: String(f.Data_Index ?? ''),
        Order: f.Order || index + 1,
        Enabled: f.Using !== undefined ? f.Using : true,
        Remark: f.Remark ?? ''
      }));
      setLogs(mappedLogs);
    }
  }, [logInfo]);

  const handleAdd = () => {
    const newId = logs.length > 0 ? Math.max(...logs.map(l => l.ID)) + 1 : 1;
    setLogs([...logs, {
      ID: newId,
      Name: '新日志',
      Unit: '',
      Type: 'string',
      Port_Type: 'TCP',
      Port_Index: '',
      Data_Index: '',
      Address: '',
      Order: logs.length + 1,
      Enabled: true,
      Remark: ''
    }]);
  };

  const handleRemove = (id: number) => {
    setLogs(logs.filter(l => l.ID !== id));
  };

  const handleChange = (id: number, field: keyof LogConfig, value: string | number | boolean) => {
    setLogs(logs.map(l => l.ID === id ? { ...l, [field]: value } : l));
  };

  const handleSave = () => {
    // In a real app, this would send data to the backend
    const updatedFields: LogField[] = logs.map(l => ({
      ID: l.ID,
      Name: l.Name,
      Type: l.Type,
      Unit: l.Unit,
      Port_Type: l.Port_Type,
      Port_Index: l.Port_Index,
      Data_Index: l.Address, // Map Address back to Data_Index
      Using: l.Enabled,
      Order: l.Order,
      Remark: l.Remark
    }));
    setLogFields(updatedFields);
    queryClient.invalidateQueries({ queryKey: ['logInfo', settings.serverIp] });
    toast.success('已在本地保存（重启后可能被服务端覆盖）');
  };

  const filteredLogs = logs.filter(log => {
    const matchId = searchId ? log.ID.toString().includes(searchId) : true;
    const matchValue = searchValue ? log.Name.includes(searchValue) || log.Type.includes(searchValue) : true;
    const matchRemark = searchRemark ? log.Remark.includes(searchRemark) : true;
    return matchId && matchValue && matchRemark;
  });

  return (
    <div className="flex flex-col h-full p-8 space-y-8 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-4xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>日志设置</h1>
          <p className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>管理和配置系统日志字段</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleAdd} variant="outline" className={`h-11 px-5 rounded-xl font-semibold transition-all duration-300 ${isDarkMode ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
            <Plus className="w-4 h-4 mr-2" />
            新增日志
          </Button>
          <Button onClick={handleSave} className="h-11 px-6 rounded-xl font-semibold bg-[#007AFF] hover:bg-[#007AFF]/90 text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)] transition-all duration-300">
            <Save className="w-4 h-4 mr-2" />
            保存设置
          </Button>
        </div>
      </div>

      <div className={`p-6 rounded-[2rem] border shadow-sm transition-colors duration-500 space-y-6 relative overflow-hidden ${isDarkMode ? 'bg-[#1c1c1e]/60 border-white/10 backdrop-blur-3xl' : 'bg-white/60 border-black/5 backdrop-blur-3xl'}`}>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
        <div className="flex flex-wrap gap-5 items-end">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>ID 查询</label>
            <div className={`relative flex items-center h-12 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-white/10 focus-within:border-[#007AFF]/50 focus-within:bg-black/40' : 'bg-black/[0.02] border-black/5 focus-within:border-[#007AFF]/50 focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(0,122,255,0.1)]'}`}>
              <Search className={`absolute left-4 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`} />
              <input 
                placeholder="输入 ID..." 
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className={`w-full h-full pl-11 pr-4 bg-transparent outline-none text-sm font-medium transition-colors ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'}`}
              />
            </div>
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>数值查询</label>
            <div className={`relative flex items-center h-12 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-white/10 focus-within:border-[#007AFF]/50 focus-within:bg-black/40' : 'bg-black/[0.02] border-black/5 focus-within:border-[#007AFF]/50 focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(0,122,255,0.1)]'}`}>
              <Search className={`absolute left-4 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`} />
              <input 
                placeholder="输入数值..." 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className={`w-full h-full pl-11 pr-4 bg-transparent outline-none text-sm font-medium transition-colors ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'}`}
              />
            </div>
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>备注查询</label>
            <div className={`relative flex items-center h-12 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-white/10 focus-within:border-[#007AFF]/50 focus-within:bg-black/40' : 'bg-black/[0.02] border-black/5 focus-within:border-[#007AFF]/50 focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(0,122,255,0.1)]'}`}>
              <Search className={`absolute left-4 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`} />
              <input 
                placeholder="输入备注..." 
                value={searchRemark}
                onChange={(e) => setSearchRemark(e.target.value)}
                className={`w-full h-full pl-11 pr-4 bg-transparent outline-none text-sm font-medium transition-colors ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-black placeholder:text-black/30'}`}
              />
            </div>
          </div>
          <Button variant="outline" onClick={() => { setSearchId(''); setSearchValue(''); setSearchRemark(''); }} className={`h-12 px-5 rounded-2xl font-semibold transition-all duration-300 ${isDarkMode ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5'}`}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重置
          </Button>
        </div>
      </div>

      <div className={`flex-1 rounded-[2rem] border shadow-sm overflow-hidden flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-[#1c1c1e]/60 border-white/10 backdrop-blur-3xl' : 'bg-white/60 border-black/5 backdrop-blur-3xl'}`}>
        <div className="flex-1 overflow-auto">
          <div className="overflow-x-auto h-full">
            <Table className="min-w-max table-fixed">
              <TableHeader className={`sticky top-0 z-10 backdrop-blur-2xl ${isDarkMode ? 'bg-[#1c1c1e]/90' : 'bg-white/90'}`}>
              <TableRow className="border-none">
                <TableHead className={`w-[80px] text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>ID</TableHead>
                <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>名称</TableHead>
                <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>单位</TableHead>
                <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>类型</TableHead>
                <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>端口</TableHead>
                <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>地址</TableHead>
                <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>顺序</TableHead>
                <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>状态</TableHead>
                <TableHead className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>备注</TableHead>
                <TableHead className={`text-right text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <p>加载中...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-slate-500">
                    没有找到匹配的日志设置
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, index) => (
                <TableRow key={log.ID} className={`group transition-colors duration-200 ${index % 2 === 0 ? (isDarkMode ? 'bg-white/[0.02]' : 'bg-black/[0.02]') : ''} ${isDarkMode ? 'border-white/5 hover:bg-white/10' : 'border-black/5 hover:bg-black/[0.05]'}`}>
                  <TableCell className="font-mono text-xs opacity-70">{log.ID}</TableCell>
                  <TableCell>
                    <input 
                      value={log.Name} 
                      onChange={(e) => handleChange(log.ID, 'Name', e.target.value)} 
                      className={`h-8 w-full px-2 rounded-lg text-sm font-semibold border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`} 
                    />
                  </TableCell>
                  <TableCell>
                    <input 
                      value={log.Unit} 
                      onChange={(e) => handleChange(log.ID, 'Unit', e.target.value)} 
                      className={`h-8 w-16 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`} 
                    />
                  </TableCell>
                  <TableCell>
                    <select 
                      value={log.Type} 
                      onChange={(e) => handleChange(log.ID, 'Type', e.target.value)} 
                      className={`h-8 w-24 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}
                    >
                      <option value="int">int</option>
                      <option value="float">float</option>
                      <option value="string">string</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <input 
                      value={log.Port_Index} 
                      onChange={(e) => handleChange(log.ID, 'Port_Index', e.target.value)} 
                      className={`h-8 w-20 px-2 rounded-lg font-mono text-xs border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`} 
                    />
                  </TableCell>
                  <TableCell>
                    <input 
                      value={log.Address} 
                      onChange={(e) => handleChange(log.ID, 'Address', e.target.value)} 
                      className={`h-8 w-full px-2 rounded-lg font-mono text-xs border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`} 
                    />
                  </TableCell>
                  <TableCell>
                    <input 
                      type="number" 
                      value={log.Order} 
                      onChange={(e) => handleChange(log.ID, 'Order', parseInt(e.target.value))} 
                      className={`h-8 w-16 px-2 rounded-lg font-mono text-xs border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`} 
                    />
                  </TableCell>
                  <TableCell>
                    <input 
                      type="checkbox" 
                      checked={log.Enabled} 
                      onChange={(e) => handleChange(log.ID, 'Enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]"
                    />
                  </TableCell>
                  <TableCell>
                    <input 
                      value={log.Remark} 
                      onChange={(e) => handleChange(log.ID, 'Remark', e.target.value)} 
                      className={`h-8 w-full px-2 rounded-lg text-xs border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`} 
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(log.ID)} className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
