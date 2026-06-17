// 日志系统侧边栏：导航菜单
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Settings, 
  Database, 
  MonitorSmartphone, 
  Activity, 
  Users, 
  CreditCard, 
  ClipboardList,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function Sidebar() {
  const { isDarkMode, connectionStatus, settings } = useAppStore();
  const location = useLocation();
  const [isLogMenuOpen, setIsLogMenuOpen] = useState(
    location.pathname.startsWith('/logs') || location.pathname === '/'
  );
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(
    location.pathname.startsWith('/devices')
  );

  const navItemClass = (isActive: boolean) => 
    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm ${
      isActive 
        ? (isDarkMode ? 'bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)] font-semibold' : 'bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)] font-semibold') 
        : (isDarkMode ? 'text-white/60 hover:bg-white/10 hover:text-white font-medium' : 'text-black/60 hover:bg-black/5 hover:text-black font-medium')
    }`;

  const subNavItemClass = (isActive: boolean) => 
    `flex items-center gap-3 px-3 py-2.5 pl-11 rounded-xl transition-all duration-300 text-sm ${
      isActive 
        ? (isDarkMode ? 'bg-white/10 text-white font-semibold shadow-sm' : 'bg-black/5 text-black font-semibold shadow-sm') 
        : (isDarkMode ? 'text-white/60 hover:bg-white/10 hover:text-white font-medium' : 'text-black/60 hover:bg-black/5 hover:text-black font-medium')
    }`;

  return (
    <div className={`w-64 h-full flex flex-col border-r relative z-10 transition-colors duration-500 ${isDarkMode ? 'bg-[#1c1c1e]/80 border-white/10 backdrop-blur-3xl' : 'bg-white/80 border-black/5 backdrop-blur-3xl'}`}>
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-[0_4px_12px_rgba(0,122,255,0.4)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className={`font-bold text-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
            IOBS 监控系统
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
        {/* 日志管理 */}
        <div>
          <button 
            onClick={() => setIsLogMenuOpen(!isLogMenuOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 ${
              isDarkMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span className="font-medium text-sm">日志管理</span>
            </div>
            {isLogMenuOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>
          
          {isLogMenuOpen && (
            <div className="mt-1 space-y-1">
              <NavLink to="/logs/settings" className={({ isActive }) => subNavItemClass(isActive)}>
                <Settings className="w-4 h-4" />
                日志设置
              </NavLink>
              <NavLink to="/logs" className={({ isActive }) => subNavItemClass(isActive || location.pathname === '/logs' || location.pathname === '/')}>
                <Database className="w-4 h-4" />
                日志数据
              </NavLink>
            </div>
          )}
        </div>

        {/* 设备管理 */}
        <div>
          <button 
            onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 ${
              isDarkMode ? 'text-white/80 hover:bg-white/5' : 'text-black/80 hover:bg-black/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <MonitorSmartphone className="w-4 h-4" />
              <span className="font-medium text-sm">设备管理</span>
            </div>
            {isDeviceMenuOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>
          
          {isDeviceMenuOpen && (
            <div className="mt-1 space-y-1">
              <NavLink to="/devices/sensors" className={({ isActive }) => subNavItemClass(isActive)}>
                <MonitorSmartphone className="w-4 h-4" />
                传感器管理
              </NavLink>
              <NavLink to="/devices/actuators" className={({ isActive }) => subNavItemClass(isActive)}>
                <MonitorSmartphone className="w-4 h-4" />
                执行器管理
              </NavLink>
              <NavLink to="/devices/list" className={({ isActive }) => subNavItemClass(isActive)}>
                <MonitorSmartphone className="w-4 h-4" />
                设备管理
              </NavLink>
              <NavLink to="/devices/status" className={({ isActive }) => subNavItemClass(isActive)}>
                <Activity className="w-4 h-4" />
                设备状态
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/procedures" className={({ isActive }) => navItemClass(isActive)}>
          <Activity className="w-4 h-4" />
          <span className="font-medium text-sm">术式管理</span>
        </NavLink>

        <NavLink to="/users" className={({ isActive }) => navItemClass(isActive)}>
          <Users className="w-4 h-4" />
          <span className="font-medium text-sm">用户管理</span>
        </NavLink>

        <NavLink to="/cards" className={({ isActive }) => navItemClass(isActive)}>
          <CreditCard className="w-4 h-4" />
          <span className="font-medium text-sm">卡片管理</span>
        </NavLink>

        <NavLink to="/records" className={({ isActive }) => navItemClass(isActive)}>
          <ClipboardList className="w-4 h-4" />
          <span className="font-medium text-sm">病历管理</span>
        </NavLink>
      </div>

      <div className={`p-4 border-t transition-colors duration-500 ${isDarkMode ? 'border-white/10 bg-[#1c1c1e]/80' : 'border-black/5 bg-white/80'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
            }`} />
            <span className={`text-xs font-medium ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>
              {connectionStatus === 'online' ? '已连接' : connectionStatus === 'connecting' ? '连接中...' : '连接断开'}
            </span>
          </div>
          <span className={`text-[10px] font-mono ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
            {settings.serverIp}
          </span>
        </div>
      </div>
    </div>
  );
}
