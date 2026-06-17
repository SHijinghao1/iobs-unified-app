// 手术过程管理页面
import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Activity, Search, Plus, Trash2, RefreshCw, Download, Stethoscope, HeartPulse, ClipboardList, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Operator {
  id: string;
  name: string;
  department: string;
  title: string;
  status: 'Active' | 'Inactive';
  proceduresCount: number;
}

const MOCK_OPERATORS: Operator[] = [
  { id: '1', name: '张医生', department: '心血管内科', title: '主任医师', status: 'Active', proceduresCount: 128 },
  { id: '2', name: '李医生', department: '神经外科', title: '副主任医师', status: 'Active', proceduresCount: 85 },
  { id: '3', name: '王医生', department: '骨科', title: '主治医师', status: 'Inactive', proceduresCount: 42 },
  { id: '4', name: '赵医生', department: '普外科', title: '主任医师', status: 'Active', proceduresCount: 215 },
  { id: '5', name: '刘医生', department: '心血管内科', title: '主治医师', status: 'Active', proceduresCount: 64 },
  { id: '6', name: '陈医生', department: '胸外科', title: '副主任医师', status: 'Active', proceduresCount: 112 },
];

export function ProcedureManagement() {
  const { isDarkMode } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [operators, setOperators] = useState<Operator[]>(MOCK_OPERATORS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredOperators = operators.filter(op => 
    op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('数据已刷新');
    }, 1000);
  };

  const handleAdd = () => {
    const newId = Date.now().toString();
    const newOp: Operator = {
      id: newId,
      name: `新术士 ${newId.slice(-4)}`,
      department: '未分配',
      title: '医师',
      status: 'Active',
      proceduresCount: 0
    };
    setOperators([newOp, ...operators]);
    toast.success('已添加新术士');
  };

  const handleDelete = (id: string) => {
    setOperators(operators.filter(o => o.id !== id));
    toast.success('已删除术士');
  };

  const handleChange = (id: string, field: keyof Operator, value: any) => {
    setOperators(operators.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const handleSave = () => {
    toast.success('术士配置已保存');
  };

  const handleExportCSV = () => {
    if (filteredOperators.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }
    const headers = ['姓名', '科室', '职称', '手术量', '状态'];
    const rows = filteredOperators.map(o => [o.name, o.department, o.title, o.proceduresCount, o.status === 'Active' ? '在职' : '离职/休假']);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `术士导出_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('导出成功');
  };

  const totalProcedures = operators.reduce((sum, op) => sum + op.proceduresCount, 0);
  const departmentsCount = new Set(operators.map(op => op.department)).size;

  const stats = [
    { label: '注册术士', value: operators.length, icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: '在职术士', value: operators.filter(o => o.status === 'Active').length, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: '累计手术量', value: totalProcedures, icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: '覆盖科室', value: departmentsCount, icon: ClipboardList, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  ];

  return (
    <div className="flex flex-col h-full p-8 space-y-6 w-full overflow-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>术士管理</h1>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>管理手术和相关操作流程的术者信息</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleRefresh} className={isDarkMode ? 'border-white/10 hover:bg-white/10' : ''}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" className={`gap-2 ${isDarkMode ? 'border-white/10 hover:bg-white/10' : ''}`} onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            导出
          </Button>
          <Button variant="outline" className={`gap-2 ${isDarkMode ? 'border-white/10 hover:bg-white/10' : ''}`} onClick={handleSave}>
            <Save className="w-4 h-4" />
            保存
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
            添加术士
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors ${isDarkMode ? 'bg-[#1c1c1e]/80 border-white/10' : 'bg-white border-black/5'}`}>
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{stat.label}</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`flex-1 flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#1c1c1e]/80 border-white/10' : 'bg-white border-black/5'}`}>
        {/* Toolbar */}
        <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
          <div className="relative w-72">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`} />
            <input 
              type="text" 
              placeholder="搜索姓名、科室或职称..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-white/5 text-white placeholder:text-white/40 focus:bg-white/10' 
                  : 'bg-black/5 text-black placeholder:text-black/40 focus:bg-black/10'
              }`}
            />
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>
            共找到 {filteredOperators.length} 名术士
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase sticky top-0 z-10 backdrop-blur-md ${isDarkMode ? 'bg-[#1c1c1e]/90 text-white/60' : 'bg-white/90 text-black/60'}`}>
              <tr>
                <th className="px-6 py-4 font-medium">姓名</th>
                <th className="px-6 py-4 font-medium">科室</th>
                <th className="px-6 py-4 font-medium">职称</th>
                <th className="px-6 py-4 font-medium">手术量</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-black/5'}`}>
              {filteredOperators.length > 0 ? (
                filteredOperators.map((op) => (
                  <tr key={op.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-500/10 text-indigo-600'}`}>
                        {op.name.charAt(0)}
                      </div>
                      <Input 
                        value={op.name} 
                        onChange={(e) => handleChange(op.id, 'name', e.target.value)}
                        className={`h-8 w-[120px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        value={op.department} 
                        onChange={(e) => handleChange(op.id, 'department', e.target.value)}
                        className={`h-8 w-[140px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        value={op.title} 
                        onChange={(e) => handleChange(op.id, 'title', e.target.value)}
                        className={`h-8 w-[140px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        type="number"
                        value={op.proceduresCount} 
                        onChange={(e) => handleChange(op.id, 'proceduresCount', parseInt(e.target.value) || 0)}
                        className={`h-8 w-[100px] font-mono ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={op.status} 
                        onChange={(e) => handleChange(op.id, 'status', e.target.value as 'Active' | 'Inactive')} 
                        className={`h-8 w-28 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${
                          op.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        <option value="Active" className="text-emerald-500">在职</option>
                        <option value="Inactive" className="text-rose-500">离职/休假</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(op.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Activity className="w-12 h-12 mb-4 opacity-20" />
                      <p>未找到匹配的术士</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
