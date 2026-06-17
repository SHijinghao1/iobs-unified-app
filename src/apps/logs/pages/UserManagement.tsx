// 用户管理页面
import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Users, Search, Plus, Trash2, RefreshCw, Download, UserCheck, UserX, Shield, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'Administrator', status: 'Active', lastLogin: '2026-03-20 08:00' },
  { id: '2', name: 'Dr. Sarah Smith', email: 'sarah.smith@example.com', role: 'Doctor', status: 'Active', lastLogin: '2026-03-19 15:30' },
  { id: '3', name: 'Nurse John Doe', email: 'john.doe@example.com', role: 'Nurse', status: 'Inactive', lastLogin: '2026-03-10 09:15' },
  { id: '4', name: 'Tech Support', email: 'support@example.com', role: 'IT Support', status: 'Active', lastLogin: '2026-03-20 07:45' },
  { id: '5', name: 'Dr. Emily Chen', email: 'emily.chen@example.com', role: 'Doctor', status: 'Active', lastLogin: '2026-03-20 10:20' },
  { id: '6', name: 'Nurse Michael', email: 'michael.n@example.com', role: 'Nurse', status: 'Active', lastLogin: '2026-03-20 06:30' },
];

export function UserManagement() {
  const { isDarkMode } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
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
    const newUser: User = {
      id: newId,
      name: `新用户 ${newId.slice(-4)}`,
      email: `user${newId.slice(-4)}@example.com`,
      role: 'User',
      status: 'Active',
      lastLogin: '-'
    };
    setUsers([newUser, ...users]);
    toast.success('已添加新用户');
  };

  const handleDelete = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
    toast.success('已删除用户');
  };

  const handleChange = (id: string, field: keyof User, value: any) => {
    setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const handleSave = () => {
    toast.success('用户配置已保存');
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }
    const headers = ['姓名', '邮箱', '角色', '状态', '最后登录'];
    const rows = filteredUsers.map(u => [u.name, u.email, u.role, u.status === 'Active' ? '正常' : '停用', u.lastLogin]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `用户导出_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('导出成功');
  };

  const stats = [
    { label: '总用户数', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: '活跃用户', value: users.filter(u => u.status === 'Active').length, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: '停用用户', value: users.filter(u => u.status === 'Inactive').length, icon: UserX, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: '管理员', value: users.filter(u => u.role === 'Administrator').length, icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  ];

  return (
    <div className="flex flex-col h-full p-8 space-y-6 w-full overflow-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>用户管理</h1>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>管理系统用户、角色和权限设置</p>
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
            添加用户
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
              placeholder="搜索姓名、邮箱或角色..." 
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
            共找到 {filteredUsers.length} 个用户
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase sticky top-0 z-10 backdrop-blur-md ${isDarkMode ? 'bg-[#1c1c1e]/90 text-white/60' : 'bg-white/90 text-black/60'}`}>
              <tr>
                <th className="px-6 py-4 font-medium">姓名</th>
                <th className="px-6 py-4 font-medium">邮箱</th>
                <th className="px-6 py-4 font-medium">角色</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium">最后登录</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-black/5'}`}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
                        {user.name.charAt(0)}
                      </div>
                      <Input 
                        value={user.name} 
                        onChange={(e) => handleChange(user.id, 'name', e.target.value)}
                        className={`h-8 w-[120px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        value={user.email} 
                        onChange={(e) => handleChange(user.id, 'email', e.target.value)}
                        className={`h-8 w-[180px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleChange(user.id, 'role', e.target.value)} 
                        className={`h-8 w-32 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}
                      >
                        <option value="Administrator">Administrator</option>
                        <option value="Doctor">Doctor</option>
                        <option value="Nurse">Nurse</option>
                        <option value="IT Support">IT Support</option>
                        <option value="User">User</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.status} 
                        onChange={(e) => handleChange(user.id, 'status', e.target.value as 'Active' | 'Inactive')} 
                        className={`h-8 w-24 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${
                          user.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        <option value="Active" className="text-emerald-500">正常</option>
                        <option value="Inactive" className="text-rose-500">停用</option>
                      </select>
                    </td>
                    <td className={`px-6 py-4 ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>{user.lastLogin}</td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(user.id)}
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
                      <Users className="w-12 h-12 mb-4 opacity-20" />
                      <p>未找到匹配的用户</p>
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
