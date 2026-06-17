// 病历管理页面
import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ClipboardList, Search, Plus, Trash2, Eye, RefreshCw, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface MedicalRecord {
  id: string;
  recordNumber: string;
  patientName: string;
  diagnosis: string;
  doctor: string;
  date: string;
  status: 'Completed' | 'In Progress' | 'Pending';
}

const MOCK_RECORDS: MedicalRecord[] = [
  { id: '1', recordNumber: 'MR-2026-001', patientName: '王大伟', diagnosis: '高血压、冠心病', doctor: '张医生', date: '2026-03-20', status: 'Completed' },
  { id: '2', recordNumber: 'MR-2026-002', patientName: '李小红', diagnosis: '偏头痛', doctor: '李医生', date: '2026-03-19', status: 'In Progress' },
  { id: '3', recordNumber: 'MR-2026-003', patientName: '赵建国', diagnosis: '2型糖尿病', doctor: '王医生', date: '2026-03-18', status: 'Completed' },
  { id: '4', recordNumber: 'MR-2026-004', patientName: '孙丽', diagnosis: '急性阑尾炎', doctor: '赵医生', date: '2026-03-20', status: 'Pending' },
];

export function MedicalRecordManagement() {
  const { isDarkMode } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<MedicalRecord[]>(MOCK_RECORDS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredRecords = records.filter(record => 
    record.recordNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.doctor.toLowerCase().includes(searchTerm.toLowerCase())
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
    const newRecord: MedicalRecord = {
      id: newId,
      recordNumber: `MR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      patientName: '新患者',
      diagnosis: '待诊断',
      doctor: '未分配',
      date: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
    setRecords([newRecord, ...records]);
    toast.success('已新建病历');
  };

  const handleDelete = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
    toast.success('已删除病历');
  };

  const handleChange = (id: string, field: keyof MedicalRecord, value: any) => {
    setRecords(records.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSave = () => {
    toast.success('病历已保存');
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }
    const headers = ['病历号', '患者姓名', '诊断', '主治医生', '就诊日期', '状态'];
    const rows = filteredRecords.map(r => [r.recordNumber, r.patientName, r.diagnosis, r.doctor, r.date, getStatusText(r.status)]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `病历导出_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('导出成功');
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-emerald-500/10 text-emerald-500';
      case 'In Progress': return 'bg-blue-500/10 text-blue-500';
      case 'Pending': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'Completed': return '已归档';
      case 'In Progress': return '治疗中';
      case 'Pending': return '待处理';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col h-full p-8 space-y-6 w-full overflow-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>病历管理</h1>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>管理患者的病历记录、诊断信息及治疗状态</p>
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
            新建病历
          </Button>
        </div>
      </div>

      <div className={`flex-1 flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#1c1c1e]/80 border-white/10' : 'bg-white border-black/5'}`}>
        {/* Toolbar */}
        <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
          <div className="relative w-72">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-black/40'}`} />
            <input 
              type="text" 
              placeholder="搜索病历号、患者、诊断或医生..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-white/5 text-white placeholder:text-white/40 focus:bg-white/10' 
                  : 'bg-black/5 text-black placeholder:text-black/40 focus:bg-black/10'
              }`}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase sticky top-0 z-10 backdrop-blur-md ${isDarkMode ? 'bg-[#1c1c1e]/90 text-white/60' : 'bg-white/90 text-black/60'}`}>
              <tr>
                <th className="px-6 py-4 font-medium">病历号</th>
                <th className="px-6 py-4 font-medium">患者姓名</th>
                <th className="px-6 py-4 font-medium">诊断</th>
                <th className="px-6 py-4 font-medium">主治医生</th>
                <th className="px-6 py-4 font-medium">就诊日期</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-black/5'}`}>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <td className={`px-6 py-4 font-mono font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      <Input 
                        value={record.recordNumber} 
                        onChange={(e) => handleChange(record.id, 'recordNumber', e.target.value)}
                        className={`h-8 w-[140px] font-mono ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
                        {record.patientName.charAt(0)}
                      </div>
                      <Input 
                        value={record.patientName} 
                        onChange={(e) => handleChange(record.id, 'patientName', e.target.value)}
                        className={`h-8 w-[100px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        value={record.diagnosis} 
                        onChange={(e) => handleChange(record.id, 'diagnosis', e.target.value)}
                        className={`h-8 w-[140px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        value={record.doctor} 
                        onChange={(e) => handleChange(record.id, 'doctor', e.target.value)}
                        className={`h-8 w-[100px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        type="date"
                        value={record.date} 
                        onChange={(e) => handleChange(record.id, 'date', e.target.value)}
                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                        className={`h-8 w-[140px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={record.status} 
                        onChange={(e) => handleChange(record.id, 'status', e.target.value as 'Completed' | 'In Progress' | 'Pending')} 
                        className={`h-8 w-24 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${getStatusStyle(record.status)}`}
                      >
                        <option value="Completed" className="text-emerald-500">已归档</option>
                        <option value="In Progress" className="text-blue-500">治疗中</option>
                        <option value="Pending" className="text-amber-500">待处理</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`hover:bg-black/5 dark:hover:bg-white/10 ${isDarkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(record.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <ClipboardList className="w-12 h-12 mb-4 opacity-20" />
                      <p>未找到匹配的病历</p>
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
