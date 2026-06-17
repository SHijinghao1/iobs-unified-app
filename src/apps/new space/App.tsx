/**
 * @file App.tsx
 * @description 手术室应用主组件，负责整体布局和状态管理
 * @author IOBS Team
 * @date 2024-01-01
 */

import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'motion/react';

import Header from './Header';
import LeftPanel from './components/LeftPanel';
import CenterSection from './components/CenterSection';
import RightSidebar from './components/RightSidebar';
import Footer from './components/Footer';
import ToastViewport from './components/ToastViewport';
import { useNewSpaceStore } from './store';

export default function App() {
  const [time, setTime] = useState(new Date());
  const [leftPanelMode, setLeftPanelMode] = useState<'dashboard' | 'carm' | 'positions' | 'agv'>('dashboard');
  const [activeCenterView, setActiveCenterView] = useState<string | null>(null);
  
  const initializeBackendSync = useNewSpaceStore((s) => s.initializeBackendSync);
  const cleanupBackendSync = useNewSpaceStore((s) => s.cleanupBackendSync);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 初始化和清理后端同步
  useEffect(() => {
    initializeBackendSync();
    return () => {
      cleanupBackendSync();
    };
  }, [initializeBackendSync, cleanupBackendSync]);

  return (
    <div className="w-screen h-screen flex flex-col bg-medical-bg overflow-hidden text-[#c9d1d9] font-sans selection:bg-medical-teal/30">
      {/* Full Screen 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        <CenterSection
          activeCenterView={activeCenterView}
          setActiveCenterView={setActiveCenterView}
          setLeftPanelMode={setLeftPanelMode}
        />
      </div>

      {/* Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="bg-[#0a1628]/92 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl">
          <Header />
        </div>
      </div>

      {/* Floating Left Panel */}
      <AnimatePresence mode="popLayout">
        {!activeCenterView && (
          <motion.div
            key="left-panel-float"
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="absolute left-0 top-[7vh] bottom-[8vh] w-[22%] min-w-[280px] z-40"
          >
            <LeftPanel 
              activeCenterView={activeCenterView}
              leftPanelMode={leftPanelMode}
              setLeftPanelMode={setLeftPanelMode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Right Sidebar */}
      <AnimatePresence mode="popLayout">
        {!activeCenterView && (
          <motion.div
            key="right-panel-float"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-[7vh] bottom-[8vh] w-[22%] min-w-[280px] z-40"
          >
            <RightSidebar
              activeCenterView={activeCenterView}
              setActiveCenterView={setActiveCenterView}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-50">
        <div className="bg-[#0a1628]/92 backdrop-blur-2xl border-t border-white/[0.06] shadow-2xl">
          <Footer
            activeCenterView={activeCenterView}
            setActiveCenterView={setActiveCenterView}
          />
        </div>
      </div>

      {/* Toasts */}
      <ToastViewport />

      {/* Ambient Noise / High Tech Overlays */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay contrast-200 grayscale" style={{ 
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' 
      }}></div>
    </div>
  );
}
