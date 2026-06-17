import { lazy, Suspense, useEffect } from 'react';
/**
 * space/App.tsx（空间端页面装配）
 * - 组装三栏布局（场景/中心信息/控制面板）
 * - 启停后端同步生命周期
 * - 承载全局错误与消息提示组件
 */
import { TopBar } from './components/layout/TopBar';
import { CenterPanel } from './components/layout/CenterPanel';
import { RightPanel } from './components/layout/RightPanel';
import { BottomBar } from './components/layout/BottomBar';
import { ToastContainer } from './components/Toast';
import { BackendErrorBanner } from './components/BackendErrorBanner';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStore } from './store';

const preloadLeftPanel = () => import('./components/layout/LeftPanel').then((m) => ({ default: m.LeftPanel }));

// 主界面骨架：负责组织三栏布局，并接上后端同步。

const LeftPanel = lazy(() => preloadLeftPanel());

const LeftPanelFallback = () => (
  <div className="h-full w-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
    <div className="text-center">
      <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-xs text-neon-cyan font-bold">加载 3D 场景...</p>
    </div>
  </div>
);

function App() {
  useKeyboardShortcuts();
  const initializeBackendSync = useStore((s) => s.initializeBackendSync);
  const cleanupBackendSync = useStore((s) => s.cleanupBackendSync);

  useEffect(() => {
    initializeBackendSync();
    return () => {
      cleanupBackendSync();
    };
  }, [cleanupBackendSync, initializeBackendSync]);

  useEffect(() => {
    const run = () => {
      void preloadLeftPanel();
    };

    const timeoutId = globalThis.setTimeout(run, 300);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-carbon-black text-white overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        {/* 三栏布局：左边3D + 中间场景 + 右边控制面板 */}
          <>
            <div className="w-1/3 h-full">
              <Suspense fallback={<LeftPanelFallback />}>
                <LeftPanel />
              </Suspense>
            </div>
            <div className="w-1/3 h-full border-l border-r border-gray-800">
              <CenterPanel />
            </div>
            <div className="w-1/3 h-full">
              <RightPanel />
            </div>
          </>
      </div>
      <BottomBar />
      <BackendErrorBanner />
      <ToastContainer />
    </div>
  );
}

export default App;