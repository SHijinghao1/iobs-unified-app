// 设备管理页面：传感器、执行器、设备列表
import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { MonitorSmartphone, Plus, Trash2, Save, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface DeviceItem {
  id: string;
  name: string;
  type: string;
  port: string;
  order: number;
  enabled: boolean;
}

function DeviceTable({ title, type }: { title: string, type: string }) {
  const { isDarkMode } = useAppStore();
  const [devices, setDevices] = useState<DeviceItem[]>([
    { id: '1', name: `示例${title} 1`, type: 'int', port: 'TCP', order: 1, enabled: true },
    { id: '2', name: `示例${title} 2`, type: 'float', port: 'UDP', order: 2, enabled: false },
  ]);

  const handleAdd = () => {
    const newId = Date.now().toString();
    setDevices([...devices, { id: newId, name: `新${title} ${newId.slice(-4)}`, type: 'string', port: 'TCP', order: devices.length + 1, enabled: true }]);
    toast.success(`已添加新${title}`);
  };

  const handleDelete = (id: string) => {
    setDevices(devices.filter(d => d.id !== id));
    toast.success(`已删除${title}`);
  };

  const handleChange = (id: string, field: keyof DeviceItem, value: any) => {
    setDevices(devices.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleSave = () => {
    toast.success(`${title}配置已保存`);
  };

  return (
    <div className="flex flex-col h-full p-8 space-y-6 w-full">
      <div>
        <h1 className={`text-4xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>{title}</h1>
        <p className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>管理和监控{title}</p>
      </div>
      
      <div className={`flex-1 rounded-[2rem] border shadow-sm p-6 transition-colors duration-500 relative overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1c1c1e]/60 border-white/10 backdrop-blur-3xl' : 'bg-white/60 border-black/5 backdrop-blur-3xl'}`}>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
        
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{title}列表</h2>
          <div className="flex space-x-2">
            <Button onClick={handleAdd} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> 增加设备
            </Button>
            <Button onClick={handleSave} variant="default" size="sm" className="gap-2">
              <Save className="w-4 h-4" /> 保存设备
            </Button>
          </div>
        </div>
        
        <div className={`flex-1 overflow-auto rounded-xl border ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-black/5 bg-white/50'}`}>
          <Table>
            <TableHeader>
              <TableRow className={isDarkMode ? 'border-white/10 hover:bg-transparent' : 'border-black/5 hover:bg-transparent'}>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>端口</TableHead>
                <TableHead>顺序</TableHead>
                <TableHead>启用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无设备
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow key={device.id} className={isDarkMode ? 'border-white/5' : 'border-black/5'}>
                    <TableCell className="font-mono text-xs opacity-70">{device.id.slice(-6)}</TableCell>
                    <TableCell className="font-medium">
                      <Input 
                        value={device.name} 
                        onChange={(e) => handleChange(device.id, 'name', e.target.value)}
                        className={`h-8 w-[150px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </TableCell>
                    <TableCell>
                      <select 
                        value={device.type} 
                        onChange={(e) => handleChange(device.id, 'type', e.target.value)} 
                        className={`h-8 w-24 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}
                      >
                        <option value="int">int</option>
                        <option value="float">float</option>
                        <option value="string">string</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <select 
                        value={device.port} 
                        onChange={(e) => handleChange(device.id, 'port', e.target.value)} 
                        className={`h-8 w-24 px-2 rounded-lg text-sm border-none outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/50 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}
                      >
                        <option value="TCP">TCP</option>
                        <option value="UDP">UDP</option>
                        <option value="Serial">Serial</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={device.order} 
                        onChange={(e) => handleChange(device.id, 'order', parseInt(e.target.value) || 0)}
                        className={`h-8 w-16 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                      />
                    </TableCell>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        checked={device.enabled} 
                        onChange={(e) => handleChange(device.id, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(device.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function SensorManagement() {
  return <DeviceTable title="传感器管理" type="Sensor" />;
}

export function ActuatorManagement() {
  return <DeviceTable title="执行器管理" type="Actuator" />;
}

export function DeviceListManagement() {
  return <DeviceTable title="设备管理" type="Device" />;
}

export function DeviceStatus() {
  const { isDarkMode } = useAppStore();
  
  const stats = [
    { label: '在线设备', value: '12', color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: '离线设备', value: '3', color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: '异常告警', value: '1', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: '总设备数', value: '16', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const devices = [
    { id: 'SENS-001', name: '温度传感器 A', status: 'online', type: 'Sensor', lastSeen: '1分钟前' },
    { id: 'SENS-002', name: '湿度传感器 B', status: 'online', type: 'Sensor', lastSeen: '2分钟前' },
    { id: 'ACT-001', name: '主阀门', status: 'offline', type: 'Actuator', lastSeen: '2小时前' },
    { id: 'ACT-002', name: '备用阀门', status: 'error', type: 'Actuator', lastSeen: '5分钟前' },
    { id: 'DEV-001', name: '主控制器', status: 'online', type: 'Device', lastSeen: '刚刚' },
  ];

  return (
    <div className="flex flex-col h-full p-8 space-y-6 w-full">
      <div>
        <h1 className={`text-4xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>设备状态</h1>
        <p className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>监控设备的实时状态</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-[#1c1c1e]/60 border-white/10' : 'bg-white/60 border-black/5'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{stat.label}</p>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.bg}`}>
                <Activity className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className={`mt-4 text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className={`flex-1 rounded-[2rem] border shadow-sm p-6 transition-colors duration-500 relative overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1c1c1e]/60 border-white/10 backdrop-blur-3xl' : 'bg-white/60 border-black/5 backdrop-blur-3xl'}`}>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
        
        <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>实时状态列表</h2>
        
        <div className={`flex-1 overflow-auto rounded-xl border ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-black/5 bg-white/50'}`}>
          <Table>
            <TableHeader>
              <TableRow className={isDarkMode ? 'border-white/10 hover:bg-transparent' : 'border-black/5 hover:bg-transparent'}>
                <TableHead>设备ID</TableHead>
                <TableHead>设备名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后在线</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} className={isDarkMode ? 'border-white/5' : 'border-black/5'}>
                  <TableCell className="font-mono text-xs opacity-70">{device.id}</TableCell>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>{device.type}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      device.status === 'online' ? 'bg-green-500/10 text-green-500' :
                      device.status === 'offline' ? 'bg-red-500/10 text-red-500' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {device.status === 'online' ? '在线' : device.status === 'offline' ? '离线' : '异常'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm opacity-70">{device.lastSeen}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
