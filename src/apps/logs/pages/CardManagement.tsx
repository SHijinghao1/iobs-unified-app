// 卡片管理页面
import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CreditCard, Search, Plus, Trash2, RefreshCw, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Card {
  id: string;
  cardNumber: string;
  holder: string;
  type: string;
  status: 'Active' | 'Lost' | 'Expired';
  issueDate: string;
}

const MOCK_CARDS: Card[] = [
  { id: '1', cardNumber: 'CARD-8472-9102', holder: 'Admin User', type: 'Master Access', status: 'Active', issueDate: '2025-01-15' },
  { id: '2', cardNumber: 'CARD-3391-4482', holder: 'Dr. Sarah Smith', type: 'Doctor ID', status: 'Active', issueDate: '2025-06-22' },
  { id: '3', cardNumber: 'CARD-1102-8837', holder: 'Nurse John Doe', type: 'Staff ID', status: 'Lost', issueDate: '2024-11-05' },
  { id: '4', cardNumber: 'CARD-9921-0034', holder: 'Tech Support', type: 'Temp Access', status: 'Expired', issueDate: '2023-08-19' },
];

export function CardManagement() {
  const { isDarkMode } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cards, setCards] = useState<Card[]>(MOCK_CARDS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredCards = cards.filter(card => 
    card.cardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.holder.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.type.toLowerCase().includes(searchTerm.toLowerCase())
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
    const newCard: Card = {
      id: newId,
      cardNumber: `CARD-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      holder: '新持卡人',
      type: 'Temp Access',
      status: 'Active',
      issueDate: new Date().toISOString().split('T')[0]
    };
    setCards([newCard, ...cards]);
    toast.success('已添加新卡片');
  };

  const handleDelete = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
    toast.success('已删除卡片');
  };

  const handleChange = (id: string, field: keyof Card, value: any) => {
    setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = () => {
    toast.success('卡片配置已保存');
  };

  const handleExportCSV = () => {
    if (filteredCards.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }
    const headers = ['卡号', '持卡人', '类型', '状态', '发卡日期'];
    const rows = filteredCards.map(c => [c.cardNumber, c.holder, c.type, getStatusText(c.status), c.issueDate]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `卡片导出_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('导出成功');
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-emerald-500/10 text-emerald-500';
      case 'Lost': return 'bg-rose-500/10 text-rose-500';
      case 'Expired': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'Active': return '正常';
      case 'Lost': return '挂失';
      case 'Expired': return '过期';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col h-full p-8 space-y-6 w-full overflow-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>卡片管理</h1>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>管理系统中的门禁卡、身份卡及权限</p>
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
            发卡/绑卡
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
              placeholder="搜索卡号、持卡人或类型..." 
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
                <th className="px-6 py-4 font-medium">卡号</th>
                <th className="px-6 py-4 font-medium">持卡人</th>
                <th className="px-6 py-4 font-medium">类型</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium">发卡日期</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-black/5'}`}>
              {filteredCards.length > 0 ? (
                filteredCards.map((card) => (
                  <tr key={card.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <td className={`px-6 py-4 font-mono font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      <div className="flex items-center gap-2">
                        <CreditCard className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <Input 
                          value={card.cardNumber} 
                          onChange={(e) => handleChange(card.id, 'cardNumber', e.target.value)}
                          className={`h-8 w-[160px] font-mono ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        value={card.holder} 
                        onChange={(e) => handleChange(card.id, 'holder', e.target.value)}
                        className={`h-8 w-[140px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        value={card.type} 
                        onChange={(e) => handleChange(card.id, 'type', e.target.value)}
                        className={`h-8 w-[140px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={card.status} 
                        onChange={(e) => handleChange(card.id, 'status', e.target.value as 'Active' | 'Lost' | 'Expired')} 
                        className={`h-8 w-24 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${getStatusStyle(card.status)}`}
                      >
                        <option value="Active" className="text-emerald-500">正常</option>
                        <option value="Lost" className="text-rose-500">挂失</option>
                        <option value="Expired" className="text-amber-500">过期</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        type="date"
                        value={card.issueDate} 
                        onChange={(e) => handleChange(card.id, 'issueDate', e.target.value)}
                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                        className={`h-8 w-[140px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(card.id)}
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
                      <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                      <p>未找到匹配的卡片</p>
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
