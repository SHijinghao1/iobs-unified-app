// Pad 主界面：组装三栏布局，负责全屏和后端同步
import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { TopBar } from './components/layout/TopBar';
import { RightPanel } from './components/layout/RightPanel';
import { BottomBar } from './components/layout/BottomBar';
import { ToastContainer } from './components/Toast';
import { BackendErrorBanner } from './components/BackendErrorBanner';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStore } from './store';
import { Maximize2 } from 'lucide-react';
import { preloadBedModel, preloadCArmModel, setPreloadProgressCallback } from './utils/modelPreloader';

const preloadLeftPanel = () => import('./components/layout/LeftPanel').then((m) => ({ default: m.LeftPanel }));

const LeftPanel = lazy(() => preloadLeftPanel());

const LeftPanelFallback = () => (
  <div className="h-full w-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
    <div className="text-center">
      <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-xs text-neon-cyan font-bold">加载 3D 场景...</p>
    </div>
  </div>
);

type HTMLElementWithFullscreen = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

type DocumentWithFullscreenPrefixes = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
};

function App() {
  useKeyboardShortcuts();
  const initializeBackendSync = useStore((s) => s.initializeBackendSync);
  const cleanupBackendSync = useStore((s) => s.cleanupBackendSync);
  const setModelLoadProgress = useStore((s) => s.setModelLoadProgress);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [preloadStarted, setPreloadStarted] = useState(false);

  const checkAndShowPrompt = useCallback(() => {
    const doc = document as DocumentWithFullscreenPrefixes;
    const isFullscreen = !!(
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    setShowFullscreenPrompt(!isFullscreen);
  }, []);

  useEffect(() => {
    setPreloadProgressCallback((loaded, total, model) => {
      const progress = Math.round((loaded / total) * 100);
      setModelLoadProgress(model, progress);
    });
  }, [setModelLoadProgress]);

  useEffect(() => {
    if (preloadStarted) return;
    setPreloadStarted(true);
    
    void Promise.all([
      preloadBedModel(),
      preloadCArmModel(),
    ]).then(() => {
      console.info('[App] Models preloaded');
    }).catch((err) => {
      console.warn('[App] Model preload error:', err);
    });
  }, [preloadStarted]);

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

  useEffect(() => {
    checkAndShowPrompt();

    const handleFullscreenChange = () => {
      checkAndShowPrompt();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [checkAndShowPrompt]);

  const enterFullscreen = async () => {
    const elem = document.documentElement as HTMLElementWithFullscreen;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('[Pad] Fullscreen failed:', err);
      setShowFullscreenPrompt(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-carbon-black text-white overflow-hidden relative">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 h-full border-r border-gray-800">
          <Suspense fallback={<LeftPanelFallback />}>
            <LeftPanel />
          </Suspense>
        </div>
        <div className="w-1/2 h-full shadow-2xl z-10 bg-carbon-black">
          <RightPanel />
        </div>
      </div>
      <BottomBar />
      <BackendErrorBanner />
      <ToastContainer />

      {showFullscreenPrompt && (
        <div
          className="absolute inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center cursor-pointer transition-opacity duration-300"
          onClick={enterFullscreen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              void enterFullscreen();
            }
          }}
        >
          <div className="text-center space-y-6 animate-pulse">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-neon-cyan/10 border-2 border-neon-cyan/40 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,255,0.3)]">
              <Maximize2 size={48} className="text-neon-cyan" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">点击进入全屏模式</h2>
              <p className="text-sm text-gray-400 font-mono">TAP TO ENTER FULLSCREEN MODE</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span>或按任意键继续</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
