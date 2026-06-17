// 日志系统页面布局：侧边栏 + 主内容区
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../../store/useAppStore';

export function Layout() {
  const { isDarkMode } = useAppStore();

  return (
    <div className={`flex h-screen w-screen overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#000000] text-slate-200' : 'bg-[#f5f5f7] text-slate-900'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative z-0">
        <Outlet />
      </main>
    </div>
  );
}
